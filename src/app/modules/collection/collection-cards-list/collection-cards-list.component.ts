import { AsyncPipe, DatePipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  QueryList,
  ViewChildren,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
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
import { catchError } from 'rxjs'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { MediaService } from '../../../services/media.service'
import { ToastService } from '../../../services/toast.service'
import { AutofocusDirective } from '../../../shared/directives/auto-focus.directive'
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
  ],
})
export class CollectionCardsListComponent {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)

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
  cardTypeFilter$ = this.collectionQuery.selectFilter('cardType')

  editNumberId?: number

  @ViewChildren(CollectionSortableHeader)
  headers!: QueryList<CollectionSortableHeader>

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
      this.collectionService.setFilter('cardType')
    } else {
      this.collectionService.setFilter('cardType', tab)
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
