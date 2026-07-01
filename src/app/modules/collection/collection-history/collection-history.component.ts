import { DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCollectionHistoryItem } from '@models'
import {
  NgbActiveModal,
  NgbPaginationModule,
  NgbProgressbarModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { catchError, EMPTY, finalize } from 'rxjs'
import { CollectionBinderComponent } from '../collection-cards-list/collection-binder/collection-binder.component'
import { CollectionCardComponent } from '../collection-cards-list/collection-card/collection-card.component'
import CollectionSetComponent from '../collection-cards-list/collection-set/collection-set.component'
import { ConditionPipe } from '../pipes/condition.pipe'
import { HistoryActionPipe } from '../pipes/history-action.pipe'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

interface HistoryDayGroup {
  day: string
  entries: ApiCollectionHistoryItem[]
}

@UntilDestroy()
@Component({
  selector: 'app-collection-history',
  templateUrl: './collection-history.component.html',
  styleUrls: ['./collection-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    DatePipe,
    FormsModule,
    NgbPaginationModule,
    NgbProgressbarModule,
    NgbTooltip,
    CollectionCardComponent,
    CollectionBinderComponent,
    CollectionSetComponent,
    ConditionPipe,
    HistoryActionPipe,
  ],
})
export class CollectionHistoryComponent implements OnInit {
  private readonly collectionService = inject(CollectionPrivateService)
  private readonly collectionQuery = inject(CollectionQuery)
  private readonly translocoService = inject(TranslocoService)
  private readonly toastService = inject(ToastService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  readonly activeModal = inject(NgbActiveModal)

  // Optional filters. cardId scopes to a single card, binderId to a binder;
  // both undefined shows the whole-collection history.
  @Input() cardId?: number
  @Input() binderId?: number

  page = 0
  size = 50
  totalElements = 0
  totalPages = 0
  loading = false
  error = false
  groups: HistoryDayGroup[] = []

  ngOnInit() {
    // BinderPipe resolves binder names from the store. When the history page is
    // opened directly (not from the collection page) the binders are not loaded
    // yet, so fetch them without wiping an already-populated store.
    if (this.collectionQuery.getBinders().length === 0) {
      this.collectionService
        .initialize()
        .pipe(untilDestroyed(this))
        .subscribe()
    }
    this.load()
  }

  load() {
    this.loading = true
    this.error = false
    this.collectionService
      .getCardHistory(this.cardId, this.binderId, this.page, this.size)
      .pipe(
        untilDestroyed(this),
        catchError(() => {
          this.error = true
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          return EMPTY
        }),
        finalize(() => {
          this.loading = false
          this.changeDetectorRef.markForCheck()
        }),
      )
      .subscribe((data) => {
        this.totalElements = data.totalElements
        this.totalPages = data.totalPages
        this.groups = this.groupByDay(data.content ?? [])
        this.changeDetectorRef.markForCheck()
      })
  }

  onPageChange(page: number) {
    this.page = page - 1
    this.load()
  }

  onPageSizeChange(size: number) {
    this.size = size
    this.page = 0
    this.load()
  }

  private groupByDay(items: ApiCollectionHistoryItem[]): HistoryDayGroup[] {
    const groups: HistoryDayGroup[] = []
    let current: HistoryDayGroup | undefined
    for (const item of items) {
      // The date is an ISO-8601 local datetime; the first 10 chars are the day.
      const day = item.date?.substring(0, 10) ?? ''
      if (!current || current.day !== day) {
        current = { day, entries: [] }
        groups.push(current)
      }
      current.entries.push(item)
    }
    return groups
  }
}
