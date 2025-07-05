import { AsyncPipe, DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
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
  NgbActiveModal,
  NgbHighlight,
  NgbTypeahead,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
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
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { ApiCrypt } from '../../../models/api-crypt'
import { ApiI18n } from '../../../models/api-i18n'
import { ApiLibrary } from '../../../models/api-library'
import { ApiSet } from '../../../models/api-set'
import { ToastService } from '../../../services/toast.service'
import { CardImagePipe } from '../../../shared/pipes/card-image.pipe'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { LibraryQuery } from '../../../state/library/library.query'
import { SetQuery } from '../../../state/set/set.query'
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
  setImageError = false
  setOptions$ = new BehaviorSubject<ApiSet[]>([])
  defaultBinderId: number | null = null
  binders$ = this.collectionQuery.selectBinders()
  loading$ = this.collectionQuery.selectLoadingBackground()
  formCard = new FormGroup({
    id: new FormControl<number | null>(null),
    card: new FormControl<SearchCard | null>(null, Validators.required),
    setAbbrev: new FormControl<string | null>(null),
    setId: new FormControl<number | null>(null),
    quantity: new FormControl<number>(1, [
      Validators.required,
      Validators.min(1),
    ]),
    condition: new FormControl<string>('NM'),
    language: new FormControl<string>('EN'),
    binder: new FormControl<number | null>(null),
    notes: new FormControl<string | null>(null),
  })

  ngOnInit() {
    this.setIdControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap(() => (this.setImageError = false)),
        tap((id) => {
          if (id !== null) {
            this.formCard.patchValue({
              setAbbrev: this.setQuery.getEntity(Number(id))?.abbrev || null,
            })
          } else {
            this.formCard.patchValue({ setAbbrev: null })
          }
        }),
      )
      .subscribe()
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
        setAbbrev: card.set ? this.setQuery.getEntity(card.set)?.abbrev : null,
        setId: card.set ?? null,
        quantity: card.number,
        condition: card.condition,
        language: card.language,
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

  get setAbbrev(): string | undefined {
    const value = this.formCard.get('setAbbrev')?.value
    return value === null ? undefined : value
  }

  get setIdControl(): FormControl<number | null> {
    return this.formCard.get('setId') as FormControl<number | null>
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
              .sort((a, b) => (a.name > b.name ? 1 : -1)),
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
      setAbbrev: null,
      setId: null,
      quantity: 1,
      condition: 'NM',
      language: 'EN',
      binder: this.defaultBinderId,
      notes: null,
    })
  }

  private getSearchCard(card: ApiCrypt | ApiLibrary): SearchCard {
    return {
      id: card.id,
      name: card.name,
      i18n: card.i18n,
      typeIcons: 'typeIcons' in card ? card.typeIcons : undefined,
      clanIcon: 'clanIcon' in card ? card.clanIcon : undefined,
      image: card.image,
      sets: card.sets,
    } as SearchCard
  }

  private updateSetOptions(item: SearchCard) {
    this.setOptions$.next(
      this.setQuery
        .getAll({ sortBy: 'lastUpdate', sortByOrder: 'desc' })
        .filter((set) =>
          item.sets.some((cardSet) => cardSet.split(':')[0] === set.abbrev),
        ),
    )
  }

  onSave(addMore: boolean) {
    if (this.formCard.valid) {
      const formValue = this.formCard.value
      const card = {
        cardId: formValue.card?.id,
        setId: formValue.setId,
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
                setAbbrev: null,
                setId: null,
                quantity: 1,
                condition: 'NM',
                language: 'EN',
                binder: null,
                notes: null,
              })
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
    if (this.formCard.valid) {
      const formValue = this.formCard.value
      const card = {
        id: formValue.id,
        cardId: formValue.card?.id,
        setId: formValue.setId,
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
}
