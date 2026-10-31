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
  output,
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
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, MediaService } from '@services'
import { LocalePipe } from '@shared/pipes/locale.pipe'
import { CountryPipe } from '@shared/pipes/country.pipe'
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { finalize, tap } from 'rxjs'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { WishlistCardStatsComponent } from '../wishlist-card-stats/wishlist-card-stats.component'

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
export class CardInfoComponent {
  readonly connection = inject(ConnectivityService)
  private apiDataService = inject(ApiDataService)
  private mediaService = inject(MediaService)
  private translocoService = inject(TranslocoService)

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
  loading = signal(false)
  cardShops = signal<ApiShop[] | null>(null)
  private readonly failedLocationFlags = signal<ReadonlySet<string>>(new Set())

  displayCardInfo = computed(() => {
    const cardInfo = this.cardInfo()
    const cardShops = this.cardShops()

    if (this.connection.offline() || !cardInfo) {
      return null
    }

    if (!cardShops) {
      return this.cardInfo()
    }

    if (
      cardInfo.shopList &&
      cardInfo.shopList[0]?.cardId !== cardShops[0]?.cardId
    ) {
      return this.cardInfo()
    }

    return {
      ...cardInfo,
      shopList: cardShops,
      hasMoreShops: false,
    }
  })

  hasEbayShops = computed(
    () =>
      this.displayCardInfo()?.shopList?.some(
        (shop) => shop.shopInfo.name === 'EBAY',
      ) ?? false,
  )

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
    const currentCardInfo = this.cardInfo()
    if (!currentCardInfo || this.loading()) {
      return
    }
    this.loading.set(true)
    this.apiDataService
      .getCardShops(this.card().id, true)
      .pipe(
        untilDestroyed(this),
        tap((shopList) => this.cardShops.set(shopList)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe()
  }
}
