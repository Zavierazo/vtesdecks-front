import { AsyncPipe, CurrencyPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { NgbActiveModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { EMPTY, Observable } from 'rxjs'
import { ApiDecks } from '../../../models/api-decks'
import { ApiShop } from '../../../models/api-shop'
import { ApiKrcgCard } from '../../../models/krcg/api-krcg-card'
import { AuthQuery } from '../../../state/auth/auth.query'
import { Shop, getShop } from '../../../utils/shops'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { ApiCrypt } from './../../../models/api-crypt'
import { ApiDataService } from './../../../services/api.data.service'
import { MediaService } from './../../../services/media.service'

@UntilDestroy()
@Component({
  selector: 'app-crypt-card',
  templateUrl: './crypt-card.component.html',
  styleUrls: ['./crypt-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    NgbTooltip,
    SetTooltipComponent,
    RulingTextComponent,
    NgxGoogleAnalyticsModule,
    RouterLink,
    AsyncPipe,
    TranslocoPipe,
    CurrencyPipe,
  ],
})
export class CryptCardComponent implements OnInit, OnDestroy {
  modal = inject(NgbActiveModal)
  private readonly authQuery = inject(AuthQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly mediaService = inject(MediaService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  readonly DRIVE_THRU_CARDS_PLATFORM = 'DTC'
  @Input() cardList!: ApiCrypt[]
  @Input() index!: number
  krcgCard$!: Observable<ApiKrcgCard>
  preconstructedDecks$!: Observable<ApiDecks>
  myDecks$!: Observable<ApiDecks>
  isMobile$!: Observable<boolean>
  shops$!: Observable<ApiShop[]>
  defaultTouch = { x: 0, y: 0, time: 0 }

  ngOnInit() {
    this.isMobile$ = this.mediaService.observeMobile()
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
    this.fetchMyDecks()
    // Push fake state to capture dismiss modal on back button
    history.pushState(
      {
        modal: true,
        desc: 'fake state for modal',
      },
      '',
    )
  }

  ngOnDestroy() {
    if (window.history.state.modal) {
      history.back()
    }
  }

  @HostListener('window:popstate', ['$event'])
  dismissModal() {
    this.modal.dismiss()
  }

  get hasMore(): boolean {
    return this.cardList.length > 1
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  handleTouch(event: TouchEvent): void {
    const touch = event.touches[0] || event.changedTouches[0]
    if (event.type === 'touchstart') {
      this.defaultTouch.x = touch.pageX
      this.defaultTouch.y = touch.pageY
      this.defaultTouch.time = event.timeStamp
    } else if (event.type === 'touchend') {
      const deltaX = touch.pageX - this.defaultTouch.x
      const deltaTime = event.timeStamp - this.defaultTouch.time
      if (deltaTime < 500) {
        if (Math.abs(deltaX) > 100) {
          if (deltaX > 0) {
            this.previousCard()
          } else {
            this.nextCard()
          }
        }
      }
    }
  }

  @HostListener('window:keydown.ArrowRight')
  @HostListener('window:keydown.ArrowDown')
  nextCard() {
    this.index = (this.index + 1) % this.cardList.length
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
    this.fetchMyDecks()
    this.changeDetectorRef.markForCheck()
  }

  @HostListener('window:keydown.ArrowLeft')
  @HostListener('window:keydown.ArrowUp')
  previousCard() {
    if (this.index === 0) {
      this.index = this.cardList.length - 1
    } else {
      this.index--
    }
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
    this.fetchMyDecks()
  }

  private fetchShops() {
    if (this.cardList[this.index]?.printOnDemand) {
      this.shops$ = this.apiDataService
        .getCardShops(this.cardList[this.index].id)
        .pipe(untilDestroyed(this))
    } else {
      this.shops$ = EMPTY
    }
  }

  private fetchRulings() {
    if (!this.cardList[this.index]) {
      return
    }
    this.krcgCard$ = this.apiDataService
      .getKrcgCard(this.cardList[this.index].id)
      .pipe(untilDestroyed(this))
  }

  private fetchPreconstructedDecks(): void {
    this.preconstructedDecks$ = this.apiDataService
      .getDecks(0, 10, {
        type: 'PRECONSTRUCTED',
        cards: `${this.cardList[this.index].id}=1`,
      })
      .pipe(untilDestroyed(this))
  }

  private fetchMyDecks(): void {
    if (this.authQuery.isAuthenticated()) {
      this.myDecks$ = this.apiDataService
        .getDecks(0, 10, {
          type: 'USER',
          cards: `${this.cardList[this.index].id}=1`,
        })
        .pipe(untilDestroyed(this))
    } else {
      this.myDecks$ = EMPTY
    }
  }

  getShopInfo(code: string): Shop | undefined {
    return getShop(code)
  }
}
