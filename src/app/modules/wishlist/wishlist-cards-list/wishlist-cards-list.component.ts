import { AsyncPipe, CurrencyPipe, DatePipe, NgClass } from '@angular/common'
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
  ApiWishlistCard,
  FILTER_CARD_NAME,
  FILTER_CARD_TYPE,
  FILTER_CLANS,
  FILTER_DISCIPLINES,
  FILTER_PRIORITY,
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
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { AutofocusDirective } from '@shared/directives/auto-focus.directive'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SetQuery } from '@state/set/set.query'
import { isCryptId } from '@utils'
import { catchError, debounceTime, EMPTY, switchMap, tap } from 'rxjs'
import { CryptCardComponent } from '../../deck-shared/crypt-card/crypt-card.component'
import { LibraryCardComponent } from '../../deck-shared/library-card/library-card.component'
import {
  CollectionFilters,
  CollectionFiltersModalComponent,
} from '../../collection/collection-filters-modal/collection-filters-modal.component'
import { CollectionCardComponent } from '../../collection/collection-cards-list/collection-card/collection-card.component'
import CollectionSetComponent from '../../collection/collection-cards-list/collection-set/collection-set.component'
import { ConditionPipe } from '../../collection/pipes/condition.pipe'
import {
  SortEvent,
  WishlistSortableHeader,
} from '../directives/wishlist-sortable.directive'
import { WishlistPriorityPipe } from '../pipes/wishlist-priority.pipe'
import { WishlistCardModalComponent } from '../wishlist-card-modal/wishlist-card-modal.component'
import { WishlistPrivateService } from '../state/wishlist-private.service'
import { WishlistQuery } from '../state/wishlist.query'

@UntilDestroy()
@Component({
  selector: 'app-wishlist-cards-list',
  templateUrl: './wishlist-cards-list.component.html',
  styleUrls: ['./wishlist-cards-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    FormsModule,
    AsyncPipe,
    WishlistSortableHeader,
    NgbPaginationModule,
    ConditionPipe,
    WishlistPriorityPipe,
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
    CollectionSetComponent,
    CurrencyPipe,
  ],
})
export class WishlistCardsListComponent implements OnInit, AfterViewInit {
  private wishlistQuery = inject(WishlistQuery)
  private wishlistService = inject(WishlistPrivateService)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)
  private setQuery = inject(SetQuery)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)
  private route = inject(ActivatedRoute)
  private router = inject(Router)

  editable = input.required<boolean>()
  multiSelect = input<boolean>(false)

  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  isLoading$ = this.wishlistQuery.selectLoading()
  cards$ = this.wishlistQuery.selectAll()
  total$ = this.wishlistQuery.selectTotalElements()
  query$ = this.wishlistQuery.selectQuery()
  cardTypeFilter$ = this.wishlistQuery.selectFilter(FILTER_CARD_TYPE)
  sets$ = this.setQuery.selectAll({
    sortBy: 'releaseDate',
    sortByOrder: 'desc',
  })

  editNumberId?: number
  form = new FormGroup({
    set: new FormControl<string | null>(null),
    cardName: new FormControl<string>(''),
    priority: new FormControl<string | null>(null),
  })
  selectedCards = new FormArray<FormControl<boolean | null>>([])

  // Advanced filters state
  currentFilters: CollectionFilters = {}
  hasActiveFilters = false

  @ViewChildren(WishlistSortableHeader)
  headers!: QueryList<WishlistSortableHeader>

  ngOnInit(): void {
    this.setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((set) => {
          const setValue = set !== null ? set : undefined
          this.updateQueryParams({ [FILTER_SET]: setValue })
          this.wishlistService.setFilter(FILTER_SET, setValue)
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
          this.wishlistService.setFilter(FILTER_CARD_NAME, searchTerm)
        }),
      )
      .subscribe()

    this.priorityControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((priority) => {
          const priorityValue = priority !== null ? priority : undefined
          this.updateQueryParams({ [FILTER_PRIORITY]: priorityValue })
          this.wishlistService.setFilter(FILTER_PRIORITY, priorityValue)
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
        column: sortBy as keyof ApiWishlistCard,
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

  get priorityControl() {
    return this.form.get(FILTER_PRIORITY) as FormControl<string | null>
  }

  onSort({ column, direction }: SortEvent) {
    this.updateQueryParams({ sortBy: column, sortDirection: direction })
    this.wishlistService.setSortBy(column, direction)
    this.updateHeaders()
  }

  private updateHeaders() {
    this.headers.forEach((header) => {
      const { sortBy, sortDirection } = this.wishlistQuery.getQuery()
      if (header.appWishlistSortable !== sortBy) {
        header.direction = ''
      } else {
        header.direction = sortDirection
      }
    })
  }

  onPageChange(page: number) {
    this.wishlistService.setPage(page - 1)
  }

  onPageSizeChange(size: number) {
    this.wishlistService.setPageSize(size)
  }

  onEdit(card: ApiWishlistCard) {
    const modalRef = this.modalService.open(WishlistCardModalComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.componentInstance.initEdit(card)
  }

  onOpenCard(card: ApiWishlistCard) {
    const crypt = isCryptId(card.cardId)
    const entity = crypt
      ? this.cryptQuery.getEntity(card.cardId)
      : this.libraryQuery.getEntity(card.cardId)
    if (!entity) {
      return
    }
    const modalRef = this.modalService.open(
      crypt ? CryptCardComponent : LibraryCardComponent,
      {
        size: 'lg',
        centered: true,
        scrollable: true,
      },
    )
    modalRef.componentInstance.cardList = [entity]
    modalRef.componentInstance.index = 0
  }

  onDelete(card: ApiWishlistCard) {
    this.wishlistService
      .deleteCards([card.id!])
      .pipe(
        untilDestroyed(this),
        catchError((error) => this.handleError(error)),
      )
      .subscribe()
  }

  onTabClick(tab: string) {
    if (tab === 'all') {
      this.wishlistService.setFilter(FILTER_CARD_TYPE)
    } else {
      this.wishlistService.setFilter(FILTER_CARD_TYPE, tab)
    }
  }

  onNumberEdit(card: ApiWishlistCard, value: string | number) {
    const newNumber = Number(value)
    if (!isNaN(newNumber) && newNumber !== card.number && newNumber >= 0) {
      if (newNumber === 0) {
        this.wishlistService
          .deleteCards([card.id!])
          .pipe(untilDestroyed(this))
          .subscribe()
      } else {
        this.wishlistService
          .updateCard({ ...card, number: newNumber })
          .pipe(untilDestroyed(this))
          .subscribe()
      }
    }
    this.editNumberId = undefined
  }

  get selectedCardsCount(): number {
    return this.selectedCards.value.filter((selected) => selected).length
  }

  onSelectCards(value: boolean) {
    this.selectedCards.controls.forEach((control) => {
      control.setValue(value)
    })
  }

  onDeleteSelectedCards() {
    const cards = this.getSelectedCards()
    const ids = cards
      .map((card) => card.id)
      .filter((id) => id !== undefined && id !== null)
    if (ids.length > 0) {
      const modalRef = this.modalService.open(ConfirmDialogComponent)
      modalRef.componentInstance.title = this.translocoService.translate(
        'wishlist.card_delete_title',
      )
      modalRef.componentInstance.message = this.translocoService.translate(
        'wishlist.card_delete_message',
      )
      modalRef.componentInstance.okLabel =
        this.translocoService.translate('shared.delete')
      modalRef.componentInstance.okButtonType = 'btn-danger'
      modalRef.closed
        .pipe(
          untilDestroyed(this),
          switchMap((confirmed: boolean) => {
            if (confirmed) {
              return this.wishlistService
                .deleteCards(ids)
                .pipe(switchMap(() => this.wishlistService.fetchCards()))
            }
            return EMPTY
          }),
          catchError((error) => this.handleError(error)),
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

  private getSelectedCards(): ApiWishlistCard[] {
    const cards = this.wishlistQuery.getAll()
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

    // Apply filters to wishlist service - send filter criteria, not card IDs
    this.wishlistService.setFilter(
      FILTER_TYPES,
      this.currentFilters.types?.join(','),
    )
    this.wishlistService.setFilter(
      FILTER_CLANS,
      this.currentFilters.clans?.join(','),
    )
    this.wishlistService.setFilter(
      FILTER_DISCIPLINES,
      this.currentFilters.disciplines?.join(','),
    )
  }

  private handleError(error: { status?: number; error?: string }): never {
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
  }
}
