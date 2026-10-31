import { ConnectivityService } from '../../../services/connectivity.service'
import {
  AsyncPipe,
  CurrencyPipe,
  DatePipe,
  NgClass,
  TitleCasePipe,
} from '@angular/common'
import {
  Component,
  computed,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  SimpleChanges,
  Injector,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCardInfo, ApiCrypt, ApiLibrary, ApiShop } from '@models'
import {
  NgbCollapse,
  NgbModal,
  NgbModalRef,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { LocalePipe } from '@shared/pipes/locale.pipe'
import { CountryPipe } from '@shared/pipes/country.pipe'
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { WishlistCardStatsComponent } from '../wishlist-card-stats/wishlist-card-stats.component'
import {
  CARD_SHOP_OFFERS_CONTEXT,
  CardShopOffersModalComponent,
  CardShopOffersState,
  createCardShopOffersState,
} from '../card-shop-offers-modal/card-shop-offers-modal.component'

interface OfferLocation {
  code: string
  type: 'country' | 'continent'
}

@UntilDestroy()
@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.component.html',
  styleUrls: ['./card-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    NgbTooltip,
    NgbCollapse,
    SetTooltipComponent,
    RulingTextComponent,
    NgxGoogleAnalyticsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    CollectionCardStatsComponent,
    WishlistCardStatsComponent,
    LazyLoadImageModule,
    LocalePipe,
    CountryPipe,
    TitleCasePipe,
    NgClass,
    AsyncPipe,
  ],
})
export class CardInfoComponent implements OnChanges, OnDestroy {
  readonly connection = inject(ConnectivityService)
  private mediaService = inject(MediaService)
  private translocoService = inject(TranslocoService)
  private modalService = inject(NgbModal)
  private shopsModalRef?: NgbModalRef

  readonly activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  })

  card = input.required<ApiCrypt | ApiLibrary>()
  activeSet = input<string | null>()
  artists = computed(() =>
    this.card().artist
      ? [
          ...new Set(
            this.card()
              .artist.split(';')
              .map((artist) => artist.trim())
              .filter((artist) => artist.length > 0),
          ),
        ]
      : undefined,
  )
  cardInfo = input<ApiCardInfo | null>()
  routerClick = output<boolean>()
  changeActiveSet = output<string>()

  isMobile$ = this.mediaService.observeMobile()
  rulingsCollapsed = true
  changesCollapsed = true
  shopsCollapsed = true
  private readonly injector = inject(Injector)
  private shopOffersState?: CardShopOffersState
  private readonly failedLocationFlags = signal<ReadonlySet<string>>(new Set())

  displayCardInfo = computed(() => {
    const cardInfo = this.cardInfo()

    if (this.connection.offline() || !cardInfo) {
      return null
    }
    return cardInfo
  })

  hasEbayShops = computed(
    () =>
      this.displayCardInfo()?.shopList?.some(
        (shop) => shop.shopInfo.name === 'EBAY',
      ) ?? false,
  )

  ngOnChanges(changes: SimpleChanges): void {
    const cardChange = changes['card']
    if (
      !cardChange ||
      cardChange.previousValue?.id === cardChange.currentValue.id
    ) {
      return
    }
    this.shopsModalRef?.close()
    this.shopsModalRef = undefined
    this.shopOffersState = undefined
  }

  ngOnDestroy(): void {
    this.shopsModalRef?.close()
  }

  shopOfferKey(shop: ApiShop): string {
    return JSON.stringify([
      shop.cardId,
      shop.shopInfo.name,
      shop.set,
      shop.locale,
      shop.seller,
      shop.link,
    ])
  }

  setActiveSet(set: string): void {
    this.changeActiveSet.emit(set)
  }

  offerLocation(shop: ApiShop): OfferLocation | undefined {
    const country = shop.country?.trim()
    if (country) {
      return { code: country.toUpperCase(), type: 'country' }
    }
    const continent = shop.continent?.trim()
    if (continent) {
      return { code: continent.toUpperCase(), type: 'continent' }
    }
    return undefined
  }

  locationFlagUrl(location: OfferLocation): string | undefined {
    if (
      (location.type === 'continent' && location.code !== 'EU') ||
      !/^[A-Z]{2}$/.test(location.code) ||
      this.failedLocationFlags().has(location.code)
    ) {
      return undefined
    }
    return `https://flagcdn.com/w40/${location.code.toLowerCase()}.png`
  }

  onLocationFlagError(code: string): void {
    this.failedLocationFlags.update((failed) => new Set([...failed, code]))
  }

  onLoadMoreShops(): void {
    if (!this.cardInfo() || this.connection.offline() || this.shopsModalRef) {
      return
    }
    this.shopOffersState ??= createCardShopOffersState()
    const modalRef = this.modalService.open(CardShopOffersModalComponent, {
      size: 'xl',
      scrollable: true,
      fullscreen: 'lg',
      windowClass: 'card-shops-modal',
      ariaLabelledBy: 'card-shop-offers-title',
      injector: Injector.create({
        parent: this.injector,
        providers: [
          {
            provide: CARD_SHOP_OFFERS_CONTEXT,
            useValue: { card: this.card(), state: this.shopOffersState },
          },
        ],
      }),
    })
    this.shopsModalRef = modalRef
    modalRef.hidden.pipe(untilDestroyed(this)).subscribe(() => {
      if (this.shopsModalRef === modalRef) {
        this.shopsModalRef = undefined
      }
    })
  }
}
