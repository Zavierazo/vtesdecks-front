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
import { ApiCrypt, ApiLibrary, ApiWishlistCard, FILTER_CARD_ID } from '@models'
import { NgbCollapse, NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { finalize, tap } from 'rxjs'
import { WishlistPriorityPipe } from '../../wishlist/pipes/wishlist-priority.pipe'
import { WishlistApiDataService } from '../../wishlist/services/wishlist-api.data.service'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@UntilDestroy()
@Component({
  selector: 'app-wishlist-card-stats',
  templateUrl: './wishlist-card-stats.component.html',
  styleUrls: ['./wishlist-card-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    NgbCollapse,
    NgbTooltip,
    SetTooltipComponent,
    WishlistPriorityPipe,
  ],
})
export class WishlistCardStatsComponent {
  private readonly wishlistApiDataService = inject(WishlistApiDataService)
  private readonly modalService = inject(NgbModal)

  card = input.required<ApiCrypt | ApiLibrary>()
  activeSet = input<string | null>()
  // Count from the card info response; undefined => anonymous user (hide panel)
  wishlistNumber = input<number | undefined>()
  routerClick = output<boolean>()

  wishlistCollapsed = signal<boolean>(true)
  loading = signal<boolean>(false)
  // undefined until the first lazy fetch (on expand or after an add)
  cards = signal<ApiWishlistCard[] | undefined>(undefined)
  private readonly localTotal = signal<number | undefined>(undefined)

  total = computed(() => this.localTotal() ?? this.wishlistNumber() ?? 0)
  visible = computed(
    () =>
      this.wishlistNumber() !== undefined || this.localTotal() !== undefined,
  )

  onToggle() {
    this.wishlistCollapsed.update((collapsed) => !collapsed)
    // Entries are fetched lazily, only when the panel is first expanded
    if (!this.wishlistCollapsed() && this.cards() === undefined) {
      this.loadCards()
    }
  }

  async onAddToWishlist(event: Event) {
    event.stopPropagation()
    // Lazy import to keep the wishlist modal out of the initial bundle
    const { WishlistCardModalComponent } = await import(
      '../../wishlist/wishlist-card-modal/wishlist-card-modal.component'
    )
    const modalRef = this.modalService.open(WishlistCardModalComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.componentInstance.selectCardFromScan(
      this.card().id,
      this.activeSet() ?? undefined,
    )
    modalRef.hidden.pipe(untilDestroyed(this)).subscribe(() => this.loadCards())
  }

  private loadCards() {
    this.loading.set(true)
    this.wishlistApiDataService
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
          this.cards.set(content)
          this.localTotal.set(
            content.reduce((acc, card) => acc + card.number, 0),
          )
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe()
  }
}
