import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe, NgClass } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { catchError, distinctUntilChanged, switchMap } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { WishlistCardsListComponent } from '../wishlist-cards-list/wishlist-cards-list.component'
import { WishlistCardModalComponent } from '../wishlist-card-modal/wishlist-card-modal.component'
import { WishlistPrivateService } from '../state/wishlist-private.service'
import { WishlistQuery } from '../state/wishlist.query'

@UntilDestroy()
@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.scss'],
  imports: [TranslocoDirective, WishlistCardsListComponent, AsyncPipe, NgClass],
})
export class WishlistComponent implements OnInit {
  private modalService = inject(NgbModal)
  private wishlistService = inject(WishlistPrivateService)
  private wishlistQuery = inject(WishlistQuery)
  private authQuery = inject(AuthQuery)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)
  private clipboard = inject(Clipboard)

  publicVisibility$ = this.wishlistQuery.selectPublicVisibility()
  multiSelect = false

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
