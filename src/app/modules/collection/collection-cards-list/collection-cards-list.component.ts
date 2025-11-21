import { animate, style, transition, trigger } from '@angular/animations'
import { AsyncPipe, DatePipe, NgClass, NgTemplateOutlet } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core'
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import {
  ApiCollectionCard,
  ApiI18n,
  ApiSet,
  FILTER_CARD_NAME,
  FILTER_CARD_TYPE,
  FILTER_CLANS,
  FILTER_DISCIPLINES,
  FILTER_GROUP_BY,
  FILTER_SET,
  FILTER_TYPES,
} from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbPaginationModule,
  NgbProgressbarModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService, ToastService } from '@services'
import { sortTrigramSimilarity } from '@utils'
import {
  catchError,
  combineLatest,
  debounceTime,
  EMPTY,
  map,
  Observable,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'
import { AutofocusDirective } from '../../../shared/directives/auto-focus.directive'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { LibraryQuery } from '../../../state/library/library.query'
import { SetQuery } from '../../../state/set/set.query'
import { CardBinderModalComponent } from '../card-binder-modal/card-binder-modal.component'
import { CardBulkEditModalComponent } from '../card-bulk-edit-modal/card-bulk-edit-modal.component'
import { CardModalComponent } from '../card-modal/card-modal.component'
import {
  CollectionFilters,
  CollectionFiltersModalComponent,
} from '../collection-filters-modal/collection-filters-modal.component'
import {
  CollectionSortableHeader,
  SortEvent,
} from '../directives/collection-sortable.directive'
import { ConditionPipe } from '../pipes/condition.pipe'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionPublicService } from '../state/collection-public.service'
import { CollectionQuery } from '../state/collection.query'
import { CollectionBinderComponent } from './collection-binder/collection-binder.component'
import { CollectionCardComponent } from './collection-card/collection-card.component'
import CollectionSetComponent from './collection-set/collection-set.component'

export interface SearchCard {
  id: number
  name: string
  i18n?: ApiI18n
  typeIcons?: string[]
  clanIcon: string
}

@UntilDestroy()
@Component({
  selector: 'app-collection-cards-list',
  templateUrl: './collection-cards-list.component.html',
  styleUrls: ['./collection-cards-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    FormsModule,
    AsyncPipe,
    CollectionSortableHeader,
    NgbPaginationModule,
    ConditionPipe,
    NgbTooltip,
    DatePipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
    NgbProgressbarModule,
    NgClass,
    CollectionCardComponent,
    AutofocusDirective,
    ReactiveFormsModule,
    DatePipe,
    CollectionBinderComponent,
    CollectionSetComponent,
    NgTemplateOutlet,
  ],
  animations: [
    trigger('fadeOut', [
      transition(':leave', [animate('300ms ease', style({ opacity: 0 }))]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class CollectionCardsListComponent implements OnInit, AfterViewInit {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private collectionPublicService = inject(CollectionPublicService)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)
  private setQuery = inject(SetQuery)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  owned = input.required<boolean>()
  editable = input.required<boolean>()
  showBinders = input.required<boolean>()
  multiSelect = input<boolean>(false)

  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  isLoading$ = this.collectionQuery.selectLoading()
  binders$ = this.collectionQuery.selectBinders()
  cards$ = this.collectionQuery.selectAll()
  total$ = this.collectionQuery.selectTotalElements()
  query$ = this.collectionQuery.selectQuery()
  cardTypeFilter$ = this.collectionQuery.selectFilter(FILTER_CARD_TYPE)
  sets$ = this.setQuery.selectAll({
    sortBy: 'releaseDate',
    sortByOrder: 'desc',
  })

  editNumberId?: number
  form = new FormGroup({
    set: new FormControl<string | null>(null),
    cardName: new FormControl<string>(''),
    groupBy: new FormControl<string | null>(null),
  })
  selectedCards = new FormArray<FormControl<boolean | null>>([])

  // Advanced filters state
  currentFilters: CollectionFilters = {}
  hasActiveFilters = false

  @ViewChildren(CollectionSortableHeader)
  headers!: QueryList<CollectionSortableHeader>

  ngOnInit(): void {
    this.setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((set) => {
          const setValue = set !== null ? set : undefined
          this.updateQueryParams({ [FILTER_SET]: setValue })
          this.collectionService.setFilter(FILTER_SET, setValue)
        }),
      )
      .subscribe()

    this.cardNameControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap((term) => {
          const searchTerm = term && term.length >= 3 ? term : undefined
          this.updateQueryParams({ [FILTER_CARD_NAME]: searchTerm })
          this.collectionService.setFilter(FILTER_CARD_NAME, searchTerm)
        }),
      )
      .subscribe()

    this.groupByControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((groupBy) => {
          const groupByValue = groupBy !== null ? groupBy : undefined
          this.updateQueryParams({ [FILTER_GROUP_BY]: groupByValue })
          this.collectionService.setFilter(FILTER_GROUP_BY, groupByValue)
        }),
      )
      .subscribe()

    this.cards$
      .pipe(
        untilDestroyed(this),
        tap((cards) => {
          this.selectedCards.clear()
          cards.forEach(() => this.selectedCards.push(new FormControl(false)))
        }),
      )
      .subscribe()
  }

  ngAfterViewInit(): void {
    this.initRouteParams()
    this.headers.changes
      .pipe(
        untilDestroyed(this),
        tap(() => this.updateHeaders()),
      )
      .subscribe()
  }

  private initRouteParams() {
    const queryParams = this.route.snapshot.queryParams
    Object.keys(this.form.controls).forEach((controlName) => {
      const paramValue = queryParams[controlName]
      if (paramValue) {
        this.form.get(controlName)?.patchValue(paramValue)
      }
    })

    // Update filters if they exist in queryParams
    const types = queryParams[FILTER_TYPES]
    const clans = queryParams[FILTER_CLANS]
    const disciplines = queryParams[FILTER_DISCIPLINES]
    if (types || clans || disciplines) {
      this.updateFilters({
        types: types ? types.split(',') : undefined,
        clans: clans ? clans.split(',') : undefined,
        disciplines: disciplines ? disciplines.split(',') : undefined,
      })
    }

    // Update sortBy and sortDirection if they exist in queryParams
    const { sortBy, sortDirection } = queryParams
    if (sortBy && sortDirection) {
      this.onSort({
        column: sortBy as keyof ApiCollectionCard,
        direction: sortDirection as 'asc' | 'desc',
      })
    }
  }

  private updateQueryParams(params: Record<string, string | undefined>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  get setControl() {
    return this.form.get(FILTER_SET) as FormControl<string | null>
  }

  get cardNameControl() {
    return this.form.get(FILTER_CARD_NAME) as FormControl<string>
  }

  get groupByControl() {
    return this.form.get(FILTER_GROUP_BY) as FormControl<string | null>
  }

  get groupBy(): string | null {
    return this.groupByControl.value
  }

  searchCard: OperatorFunction<string, number[]> = (
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
              .sort((a, b) => sortTrigramSimilarity(a.name, b.name, term))
              .map((card) => card.id),
          ),
        ),
      ),
    )

  getSet(set: string | undefined): ApiSet | undefined {
    if (!set) {
      return undefined
    }
    return this.setQuery.getEntityByAbbrev(set)
  }

  onSort({ column, direction }: SortEvent) {
    this.updateQueryParams({ sortBy: column, sortDirection: direction })
    this.collectionService.setSortBy(column, direction)
    this.updateHeaders()
  }

  private updateHeaders() {
    this.headers.forEach((header) => {
      const { sortBy, sortDirection } = this.collectionQuery.getQuery()
      if (header.appSortable !== sortBy) {
        header.direction = ''
      } else {
        header.direction = sortDirection
      }
    })
  }

  onPageChange(page: number) {
    this.collectionService.setPage(page - 1)
  }

  onPageSizeChange(size: number) {
    this.collectionService.setPageSize(size)
  }

  onEdit(card: ApiCollectionCard) {
    const modalRef = this.modalService.open(CardModalComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.componentInstance.initEdit(card)
  }

  onDelete(card: ApiCollectionCard) {
    this.collectionService
      .deleteCards([card.id!])
      .pipe(
        untilDestroyed(this),
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

  onMoveToBinder(card: ApiCollectionCard) {
    const modalRef = this.modalService.open(CardBinderModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.initAdd(card)
  }

  onTabClick(tab: string) {
    if (tab === 'all') {
      this.collectionService.setFilter(FILTER_CARD_TYPE)
    } else {
      this.collectionService.setFilter(FILTER_CARD_TYPE, tab)
    }
  }

  onNumberEdit(card: ApiCollectionCard, value: string | number) {
    const newNumber = Number(value)
    if (!isNaN(newNumber) && newNumber !== card.number && newNumber >= 0) {
      if (newNumber === 0) {
        this.collectionService
          .deleteCards([card.id!])
          .pipe(untilDestroyed(this))
          .subscribe()
      } else {
        this.collectionService
          .updateCard({ ...card, number: newNumber })
          .pipe(untilDestroyed(this))
          .subscribe()
      }
    }
    this.editNumberId = undefined
  }

  onToggleGroup(card: ApiCollectionCard) {
    if (this.owned()) {
      this.collectionService
        .toggleGroupCard(card)
        .pipe(untilDestroyed(this))
        .subscribe()
    } else {
      this.collectionPublicService
        .toggleGroupCard(card)
        .pipe(untilDestroyed(this))
        .subscribe()
    }
  }

  get selectedCardsCount(): number {
    return this.selectedCards.value.filter((selected) => selected).length
  }

  onSelectCards(value: boolean) {
    this.selectedCards.controls.forEach((control) => {
      control.setValue(value)
    })
  }

  onEditSelectedCards() {
    const ids = this.getSelectedCards()
    if (ids.length > 0) {
      const modalRef = this.modalService.open(CardBulkEditModalComponent, {
        size: 'lg',
        centered: true,
      })
      modalRef.componentInstance.init(ids)
    }
  }

  onDeleteSelectedCards() {
    const cards = this.getSelectedCards()
    const ids = cards
      .map((card) => card.id)
      .filter((id) => id !== undefined && id !== null)
    if (ids.length > 0) {
      const modalRef = this.modalService.open(ConfirmDialogComponent)
      modalRef.componentInstance.title = this.translocoService.translate(
        'collection.card_delete_title',
      )
      modalRef.componentInstance.message = this.translocoService.translate(
        'collection.card_delete_message',
      )
      modalRef.componentInstance.okLabel =
        this.translocoService.translate('shared.delete')
      modalRef.componentInstance.okButtonType = 'btn-danger'
      modalRef.closed
        .pipe(
          untilDestroyed(this),
          switchMap((confirmed: boolean) => {
            if (confirmed) {
              return this.collectionService
                .deleteCards(ids)
                .pipe(switchMap(() => this.collectionService.fetchCards()))
            }
            return EMPTY
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

  onOpenFilters() {
    const modalRef = this.modalService.open(CollectionFiltersModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.initFilters(this.currentFilters)
    modalRef.closed.subscribe((result: { filters?: CollectionFilters }) => {
      if (result.filters) {
        this.updateFilters(result.filters)
      }
    })
  }

  onClearFilters() {
    this.updateFilters({})
  }

  private getSelectedCards(): ApiCollectionCard[] {
    const cards = this.collectionQuery.getAll()
    return this.selectedCards.controls
      .map((control, index) => (control.value ? cards[index] : null))
      .filter((card) => card !== undefined && card !== null)
  }

  private updateFilters(filters: CollectionFilters) {
    this.currentFilters = filters
    this.hasActiveFilters =
      (this.currentFilters.types?.length ?? 0) > 0 ||
      (this.currentFilters.clans?.length ?? 0) > 0 ||
      (this.currentFilters.disciplines?.length ?? 0) > 0

    // Update URL with new filters
    this.updateQueryParams({
      [FILTER_TYPES]: this.currentFilters.types?.join(','),
      [FILTER_CLANS]: this.currentFilters.clans?.join(','),
      [FILTER_DISCIPLINES]: this.currentFilters.disciplines?.join(','),
    })

    // Apply filters to collection service - send filter criteria, not card IDs
    this.collectionService.setFilter(
      FILTER_TYPES,
      this.currentFilters.types?.join(','),
    )
    this.collectionService.setFilter(
      FILTER_CLANS,
      this.currentFilters.clans?.join(','),
    )
    this.collectionService.setFilter(
      FILTER_DISCIPLINES,
      this.currentFilters.disciplines?.join(','),
    )
  }
}
