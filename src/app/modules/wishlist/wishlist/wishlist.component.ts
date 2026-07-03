import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { catchError, distinctUntilChanged, finalize, switchMap } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { ShoppingOptimizerModalComponent } from '../../deck-shared/shopping-optimizer-modal/shopping-optimizer-modal.component'
import { WishlistApiDataService } from '../services/wishlist-api.data.service'
import { WishlistCardsListComponent } from '../wishlist-cards-list/wishlist-cards-list.component'
import { WishlistCardModalComponent } from '../wishlist-card-modal/wishlist-card-modal.component'
import { WishlistPrivateService } from '../state/wishlist-private.service'
import { WishlistQuery } from '../state/wishlist.query'
import { WishlistQueryState } from '../state/wishlist.store'

@UntilDestroy()
@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss'],
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    WishlistCardsListComponent,
    AsyncPipe,
    NgClass,
  ],
})
export class WishlistComponent implements OnInit {
  private modalService = inject(NgbModal)
  private wishlistService = inject(WishlistPrivateService)
  private wishlistQuery = inject(WishlistQuery)
  private wishlistApiDataService = inject(WishlistApiDataService)
  private authQuery = inject(AuthQuery)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)
  private clipboard = inject(Clipboard)

  publicVisibility$ = this.wishlistQuery.selectPublicVisibility()
  totalElements$ = this.wishlistQuery.selectTotalElements()
  multiSelect = false
  fetchingAll = false

  ngOnInit() {
    this.wishlistService.initialize()
    this.wishlistQuery
      .selectQuery()
      .pipe(
        untilDestroyed(this),
        distinctUntilChanged(),
        switchMap(() => this.wishlistService.fetchCards()),
      )
      .subscribe()
  }

  onToggleMultiSelect() {
    this.multiSelect = !this.multiSelect
  }

  onAddCard() {
    this.modalService.open(WishlistCardModalComponent, {
      size: 'xl',
      centered: true,
    })
  }

  onHowToBuy() {
    if (this.fetchingAll) {
      return
    }
    this.fetchingAll = true
    // The store only holds the current page, so fetch the full wishlist
    const query: WishlistQueryState = {
      page: 0,
      pageSize: 10000,
      sortBy: 'cardName',
      sortDirection: 'asc',
      filters: [],
    }
    this.wishlistApiDataService
      .getCards(query)
      .pipe(
        untilDestroyed(this),
        finalize(() => (this.fetchingAll = false)),
      )
      .subscribe({
        next: (page) => {
          const cards = (page.content ?? []).map((card) => ({
            id: card.cardId,
            number: card.number,
          }))
          if (cards.length === 0) {
            return
          }
          const modalRef = this.modalService.open(
            ShoppingOptimizerModalComponent,
            {
              size: 'xl',
              centered: true,
              scrollable: true,
            },
          )
          modalRef.componentInstance.cards = cards
          modalRef.componentInstance.allowExcludeOwned = false
        },
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
        },
      })
  }

  onToggleVisibility() {
    const next = !this.wishlistQuery.getPublicVisibility()
    this.wishlistService
      .setVisibility(next)
      .pipe(
        untilDestroyed(this),
        catchError((error) => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          throw error
        }),
      )
      .subscribe()
  }

  onShare() {
    const username = this.authQuery.getUser()
    if (!username) {
      return
    }
    const url = `https://${environment.domain}/collections/users/${username}/wishlist`
    if (window.navigator.share) {
      ;(async () => {
        await window.navigator.share({
          url: url,
        })
      })()
    } else {
      this.clipboard.copy(url)
      this.toastService.show(
        this.translocoService.translate('wishlist.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }
}
