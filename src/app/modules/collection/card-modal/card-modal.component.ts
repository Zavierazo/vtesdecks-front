import { AsyncPipe, DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import {
  ApiCollectionCard,
  ApiCollectionPage,
  ApiCrypt,
  ApiI18n,
  ApiLibrary,
  ApiSet,
  FILTER_CARD_ID,
} from '@models'
import {
  NgbActiveModal,
  NgbCollapse,
  NgbHighlight,
  NgbTooltip,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SetQuery } from '@state/set/set.query'
import { getSetAbbrev, sortTrigramSimilarity } from '@utils'
import { LazyLoadImageModule, StateChange } from 'ng-lazyload-image'
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  Observable,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '../../../../environments/environment'
import { CollectionBinderComponent } from '../collection-cards-list/collection-binder/collection-binder.component'
import CollectionSetComponent from '../collection-cards-list/collection-set/collection-set.component'
import { ConditionPipe } from '../pipes/condition.pipe'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

export interface SearchCard {
  id: number
  name: string
  i18n?: ApiI18n
  typeIcons?: string[]
  clanIcon: string
  image: string
  sets: string[]
}

@UntilDestroy()
@Component({
  selector: 'app-card-modal',
  templateUrl: './card-modal.component.html',
  styleUrls: ['./card-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    TranslocoDirective,
    ReactiveFormsModule,
    NgbHighlight,
    NgbTypeahead,
    CardImagePipe,
    AsyncPipe,
    DatePipe,
    LazyLoadImageModule,
    CollectionSetComponent,
    CollectionBinderComponent,
    ConditionPipe,
    NgbTooltip,
    NgbCollapse,
  ],
})
export class CardModalComponent implements OnInit {
  private collectionService = inject(CollectionPrivateService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)
  private collectionQuery = inject(CollectionQuery)
  private setQuery = inject(SetQuery)

  activeModal = inject(NgbActiveModal)
  @ViewChild('quantityInput') quantityInput?: ElementRef<HTMLInputElement>
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>
  setImageError = false
  setOptions$ = new BehaviorSubject<ApiSet[]>([])
  defaultBinderId: number | null = null
  binders$ = this.collectionQuery.selectBinders()
  loading$ = this.collectionQuery.selectLoadingBackground()
  isExistingCardsCollapsed = true
  formCard = new FormGroup({
    id: new FormControl<number | null>(null),
    card: new FormControl<SearchCard | null>(null, Validators.required),
    set: new FormControl<string | null>(null),
    quantity: new FormControl<number>(1, [
      Validators.required,
      Validators.min(1),
    ]),
    condition: new FormControl<string | null>(null),
    language: new FormControl<string>('EN'),
    binder: new FormControl<number | null>(null),
    notes: new FormControl<string | null>(null),
  })
  cdnDomain = environment.cdnDomain
  existingCards$!: Observable<ApiCollectionPage>

  ngOnInit() {
    this.setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap(() => (this.setImageError = false)),
      )
      .subscribe()

    // Focus search input when modal opens (only if not editing)
    if (!this.cardCollectionId) {
      setTimeout(() => {
        this.searchInput?.nativeElement.focus()
      }, 0)
    }
  }

  initEdit(card: ApiCollectionCard) {
    const cryptCard = this.cryptQuery.getEntity(card.cardId)
    const libraryCard = this.libraryQuery.getEntity(card.cardId)
    const cardData = cryptCard ?? libraryCard
    if (cardData) {
      const searchCard = this.getSearchCard(cardData)
      this.updateSetOptions(searchCard)
      this.formCard.patchValue({
        id: card.id,
        card: searchCard,
        set: card.set ?? null,
        quantity: card.number,
        condition: card.condition ?? null,
        language: card.language ?? 'EN',
        binder: card.binderId ?? null,
        notes: card.notes ?? null,
      })
    }
  }

  initBinder(binderId: number | null) {
    this.defaultBinderId = binderId
    if (binderId) {
      this.formCard.patchValue({ binder: binderId })
    }
  }

  get cardCollectionId(): number | null | undefined {
    return this.formCard.get('id')?.value
  }

  get card(): SearchCard | null | undefined {
    return this.formCard.get('card')?.value
  }

  get set(): string | undefined {
    const value = this.formCard.get('set')?.value
    return value === null ? undefined : value
  }

  get setControl(): FormControl<number | null> {
    return this.formCard.get('set') as FormControl<number | null>
  }

  get quantityControl(): FormControl<number> {
    return this.formCard.get('quantity') as FormControl<number>
  }

  searchCard: OperatorFunction<string, SearchCard[]> = (
    text$: Observable<string>,
  ) =>
    text$.pipe(
      switchMap((term) =>
        combineLatest([
          this.libraryQuery.selectByName(term, 10),
          this.cryptQuery.selectByName(term, 10),
        ]).pipe(
          map(([libraryCards, cryptCards]) =>
            [...libraryCards, ...cryptCards]
              .map((card) => this.getSearchCard(card))
              .sort((a, b) => sortTrigramSimilarity(a.name, b.name, term)),
          ),
        ),
      ),
    )

  formatter = (x: { name: string }) => x.name

  selectCardItem(
    selectItemEvent: NgbTypeaheadSelectItemEvent<SearchCard>,
    input: HTMLInputElement,
  ) {
    selectItemEvent.preventDefault()
    input.value = ''
    const item = selectItemEvent.item
    this.updateSetOptions(item)
    this.formCard.patchValue({
      id: null,
      card: item,
      set: null,
      quantity: 1,
      condition: null,
      language: 'EN',
      binder: this.defaultBinderId,
      notes: null,
    })
    // Focus quantity input after a short delay to ensure the form is rendered
    setTimeout(() => {
      this.quantityInput?.nativeElement.focus()
      this.quantityInput?.nativeElement.select()
    }, 0)

    this.existingCards$ = this.collectionService.getCards({
      page: 0,
      pageSize: 100,
      sortBy: 'number',
      sortDirection: 'desc',
      filters: [[FILTER_CARD_ID, item.id]],
    })
  }

  private getSearchCard(card: ApiCrypt | ApiLibrary): SearchCard {
    return {
      id: card.id,
      name: card.name,
      i18n: card.i18n,
      typeIcons: 'typeIcons' in card ? card.typeIcons : undefined,
      clanIcon: 'clanIcon' in card ? card.clanIcon : undefined,
      adv: 'adv' in card ? card.adv : undefined,
      image: card.image,
      sets: card.sets,
    } as SearchCard
  }

  private updateSetOptions(item: SearchCard) {
    this.setOptions$.next(
      this.setQuery
        .getAll({ sortBy: 'releaseDate', sortByOrder: 'desc' })
        .filter((set) =>
          item.sets.some((cardSet) => getSetAbbrev(cardSet) === set.abbrev),
        ),
    )
  }

  onSave(addMore: boolean) {
    this.formCard.markAllAsTouched()
    if (this.formCard.valid) {
      const formValue = this.formCard.value
      const card = {
        cardId: formValue.card?.id,
        set: formValue.set,
        number: formValue.quantity,
        binderId: formValue.binder,
        condition: formValue.condition,
        language: formValue.language,
        notes: formValue.notes,
      } as ApiCollectionCard
      this.collectionService
        .addCard(card)
        .pipe(
          untilDestroyed(this),
          tap(() => {
            if (addMore) {
              this.formCard.reset({
                id: null,
                card: null,
                set: null,
                quantity: 1,
                condition: null,
                language: 'EN',
                binder: null,
                notes: null,
              })
              // Focus search input after reset
              setTimeout(() => {
                this.searchInput?.nativeElement.focus()
              }, 0)
            } else {
              this.activeModal.close()
            }
          }),
          catchError((error) => {
            if (error.status === 400 && error.error) {
              this.toastService.show(error.error, {
                classname: 'bg-danger text-light',
                delay: 5000,
              })
            } else {
              console.error('Unexpected error:', error)
              this.toastService.show(
                this.translocoService.translate('shared.unexpected_error'),
                { classname: 'bg-danger text-light', delay: 5000 },
              )
            }
            throw error
          }),
        )
        .subscribe()
    }
  }

  onEdit() {
    this.formCard.markAllAsTouched()
    if (this.formCard.valid) {
      const formValue = this.formCard.value
      const card = {
        id: formValue.id,
        cardId: formValue.card?.id,
        set: formValue.set,
        number: formValue.quantity,
        binderId: formValue.binder,
        condition: formValue.condition,
        language: formValue.language,
        notes: formValue.notes,
      } as ApiCollectionCard
      this.collectionService
        .updateCard(card)
        .pipe(
          untilDestroyed(this),
          tap(() => this.activeModal.close()),
          catchError((error) => {
            if (error.status === 400 && error.error) {
              this.toastService.show(error.error, {
                classname: 'bg-danger text-light',
                delay: 5000,
              })
            } else {
              console.error('Unexpected error:', error)
              this.toastService.show(
                this.translocoService.translate('shared.unexpected_error'),
                { classname: 'bg-danger text-light', delay: 5000 },
              )
            }
            throw error
          }),
        )
        .subscribe()
    }
  }

  onLazyLoadEvent(event: StateChange) {
    if (event.reason === 'loading-failed') {
      this.setImageError = true
    }
  }
}
