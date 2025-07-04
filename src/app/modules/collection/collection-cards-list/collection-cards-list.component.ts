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
import { TranslocoDirective } from '@jsverse/transloco'
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
import { UntilDestroy } from '@ngneat/until-destroy'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { MediaService } from '../../../services/media.service'
import { CardModalComponent } from '../card-modal/card-modal.component'
import {
  CollectionSortableHeader,
  SortEvent,
} from '../directives/collection-sortable.directive'
import { BinderPipe } from '../pipes/binder.pipe'
import { ConditionPipe } from '../pipes/condition.pipe'
import { CollectionQuery } from '../state/collection.query'
import { CollectionService } from '../state/collection.service'
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
  ],
})
export class CollectionCardsListComponent {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionService)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)

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

  @ViewChildren(CollectionSortableHeader)
  headers!: QueryList<CollectionSortableHeader>

  onSort({ column, direction }: SortEvent) {
    this.headers.forEach((header) => {
      if (header.appSortable !== column) {
        header.direction = ''
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
    //TODO: Implement delete functionality here
    console.log('Delete card with ID:', card)
  }

  onTabClick(tab: string) {
    if (tab === 'all') {
      this.collectionService.setFilter('cardType')
    } else {
      this.collectionService.setFilter('cardType', tab)
    }
  }
}
