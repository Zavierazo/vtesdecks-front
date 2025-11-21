import { Clipboard } from '@angular/cdk/clipboard'
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
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCrypt, ApiDecks, ApiKrcgCard, ApiShop } from '@models'
import { NgbActiveModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, MediaService, ToastService } from '@services'
import { LazyLoadImageModule, StateChange } from 'ng-lazyload-image'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { EMPTY, Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { CardImagePipe } from '../../../shared/pipes/card-image.pipe'
import { Shop, getShop } from '../../../utils/shops'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

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
    CardImagePipe,
    CollectionCardStatsComponent,
    LazyLoadImageModule,
  ],
})
export class CryptCardComponent implements OnInit, OnDestroy {
  modal = inject(NgbActiveModal)
  private readonly apiDataService = inject(ApiDataService)
  private readonly mediaService = inject(MediaService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly toastService = inject(ToastService)
  private readonly clipboard = inject(Clipboard)
  private readonly translocoService = inject(TranslocoService)

  readonly DRIVE_THRU_CARDS_PLATFORM = 'DTC'
  @Input() cardList!: ApiCrypt[]
  @Input() index!: number
  krcgCard$!: Observable<ApiKrcgCard>
  preconstructedDecks$!: Observable<ApiDecks>
  isMobile$!: Observable<boolean>
  shops$!: Observable<ApiShop[]>
  defaultTouch = { x: 0, y: 0, time: 0 }
  activeSet?: string
  setImageError = false
  cdnDomain = environment.cdnDomain

  ngOnInit() {
    this.isMobile$ = this.mediaService.observeMobile()
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
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
    this.setActiveSet()
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
    this.setActiveSet()
    this.changeDetectorRef.markForCheck()
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

  getShopInfo(code: string): Shop | undefined {
    return getShop(code)
  }

  setActiveSet(set?: string) {
    this.setImageError = false
    if (set === this.activeSet) {
      this.activeSet = undefined
    } else {
      this.activeSet = set
    }
    this.changeDetectorRef.markForCheck()
  }

  onLazyLoadEvent(event: StateChange) {
    if (event.reason === 'loading-failed') {
      this.setImageError = true
    }
  }

  onShare() {
    const url = `https://${environment.domain}/cards/crypt?cardId=${this.cardList[this.index].id}`
    if (window.navigator.share) {
      ;(async () => {
        await window.navigator.share({
          url: url,
        })
      })()
    } else {
      this.clipboard.copy(url)
      this.toastService.show(
        this.translocoService.translate('deck.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }
}
