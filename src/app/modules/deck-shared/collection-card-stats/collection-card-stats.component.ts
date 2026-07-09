import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  ApiCollectionCard,
  ApiCollectionCardStats,
  ApiCrypt,
  ApiLibrary,
  FILTER_CARD_ID,
} from '@models'
import { NgbCollapse, NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { finalize, tap } from 'rxjs'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@UntilDestroy()
@Component({
  selector: 'app-collection-card-stats',
  templateUrl: './collection-card-stats.component.html',
  styleUrls: ['./collection-card-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    NgbTooltip,
    NgbCollapse,
    SetTooltipComponent,
    NgClass,
  ],
})
export class CollectionCardStatsComponent {
  private readonly collectionApiDataService = inject(CollectionApiDataService)
  private readonly modalService = inject(NgbModal)

  card = input.required<ApiCrypt | ApiLibrary>()
  activeSet = input<string | null>()
  collectionStats = input<ApiCollectionCardStats | undefined>()
  // Hint from card-info: wishlistNumber defined => logged-in user
  loggedIn = input<boolean>(false)
  routerClick = output<boolean>()

  decksCollapsed = true
  collectionCollapsed = signal<boolean>(true)
  loading = signal<boolean>(false)
  // undefined until the first refresh after an add/edit from this panel
  private readonly localCards = signal<ApiCollectionCard[] | undefined>(
    undefined,
  )
  private readonly localTotal = signal<number | undefined>(undefined)

  cards = computed(
    () => this.localCards() ?? this.collectionStats()?.collectionCards ?? [],
  )
  total = computed(
    () => this.localTotal() ?? this.collectionStats()?.collectionNumber ?? 0,
  )
  collectionVisible = computed(
    () =>
      this.loggedIn() ||
      this.collectionStats() !== undefined ||
      this.localTotal() !== undefined,
  )

  onToggleCollection() {
    this.collectionCollapsed.update((collapsed) => !collapsed)
  }

  async onAddToCollection(event: Event) {
    event.stopPropagation()
    const modalRef = await this.openCardModal()
    modalRef.componentInstance.selectCardFromScan(
      this.card().id,
      this.activeSet() ?? undefined,
    )
  }

  async onEditRow(row: ApiCollectionCard, event: Event) {
    event.stopPropagation()
    const modalRef = await this.openCardModal()
    modalRef.componentInstance.initEdit(row)
  }

  private async openCardModal() {
    // Lazy import to keep the collection modal out of the initial bundle
    const { CardModalComponent } = await import(
      '../../collection/card-modal/card-modal.component'
    )
    const modalRef = this.modalService.open(CardModalComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.hidden.pipe(untilDestroyed(this)).subscribe(() => this.loadCards())
    return modalRef
  }

  private loadCards() {
    this.loading.set(true)
    this.collectionApiDataService
      .getCards({
        page: 0,
        pageSize: 100,
        sortBy: 'number',
        sortDirection: 'desc',
        filters: [[FILTER_CARD_ID, this.card().id]],
      })
      .pipe(
        untilDestroyed(this),
        tap((page) => {
          const content = page.content ?? []
          this.localCards.set(content)
          this.localTotal.set(
            content.reduce((acc, card) => acc + card.number, 0),
          )
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe()
  }
}
