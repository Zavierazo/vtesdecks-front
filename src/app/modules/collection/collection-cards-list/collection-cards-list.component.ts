import { animate, style, transition, trigger } from '@angular/animations'
import { AsyncPipe, DatePipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
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
import {
  catchError,
  combineLatest,
  debounceTime,
  map,
  Observable,
  OperatorFunction,
  switchMap,
  tap,
} from 'rxjs'
import {
  ApiCollectionCard,
  FILTER_CARD_NAME,
  FILTER_CARD_TYPE,
  FILTER_SET,
} from '../../../models/api-collection-card'
import { ApiI18n } from '../../../models/api-i18n'
import { ApiSet } from '../../../models/api-set'
import { MediaService } from '../../../services/media.service'
import { ToastService } from '../../../services/toast.service'
import { AutofocusDirective } from '../../../shared/directives/auto-focus.directive'
import { CardSetPipe } from '../../../shared/pipes/card-set.pipe'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { LibraryQuery } from '../../../state/library/library.query'
import { SetQuery } from '../../../state/set/set.query'
import { CardBinderModalComponent } from '../card-binder-modal/card-binder-modal.component'
import { CardModalComponent } from '../card-modal/card-modal.component'
import {
  CollectionSortableHeader,
  SortEvent,
} from '../directives/collection-sortable.directive'
import { BinderPipe } from '../pipes/binder.pipe'
import { ConditionPipe } from '../pipes/condition.pipe'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'
import { CollectionCardComponent } from './collection-card/collection-card.component'

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
    BinderPipe,
    NgbTooltip,
    DatePipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
    NgbProgressbarModule,
    RouterLink,
    NgClass,
    CollectionCardComponent,
    AutofocusDirective,
    ReactiveFormsModule,
    DatePipe,
    CardSetPipe,
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
export class CollectionCardsListComponent implements OnInit {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)
  private setQuery = inject(SetQuery)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)

  owned = input.required<boolean>()
  editable = input.required<boolean>()
  showBinders = input.required<boolean>()

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
  setFormControl = new FormControl<string | null>(null)
  searchCardFormControl = new FormControl<string>('')

  @ViewChildren(CollectionSortableHeader)
  headers!: QueryList<CollectionSortableHeader>

  ngOnInit(): void {
    this.setFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((set) => {
          this.collectionService.setFilter(
            FILTER_SET,
            set !== null ? set : undefined,
          )
        }),
      )
      .subscribe()

    this.searchCardFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap((term) => {
          if (term && term.length >= 3) {
            this.collectionService.setFilter(FILTER_CARD_NAME, term)
          } else {
            this.collectionService.setFilter(FILTER_CARD_NAME, undefined)
          }
        }),
      )
      .subscribe()
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
            [...libraryCards, ...cryptCards].map((card) => card.id),
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
    this.headers.forEach((header) => {
      if (header.appSortable !== column) {
        header.direction = ''
      } else {
        header.direction = direction
      }
    })
    this.collectionService.setSortBy(column, direction)
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
      .deleteCard(card.id!)
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
          .deleteCard(card.id!)
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
}
