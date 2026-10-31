import { CurrencyPipe, TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  InjectionToken,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCrypt, ApiLibrary, ApiShop } from '@models'
import {
  NgbActiveModal,
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { CountryPipe, getRegionDisplayName } from '@shared/pipes/country.pipe'
import { getLocaleDisplayName, LocalePipe } from '@shared/pipes/locale.pipe'
import {
  FilterChip,
  FilterChipsComponent,
} from '@shared/components/filter-chips/filter-chips.component'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { finalize } from 'rxjs'
import { ConnectivityService } from '../../../services/connectivity.service'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { SetQuery } from '@state/set/set.query'
import { getSetAbbrev } from '@utils'

interface OfferLocation {
  code: string
  type: 'country' | 'continent'
}

type ShopFilterKey =
  'shop' | 'seller' | 'country' | 'continent' | 'locale' | 'set'
type ShopFilters = Record<ShopFilterKey, string[]>

const SHOP_CONTINENTS = new Set(['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'])

export interface CardShopOffersState {
  offers: WritableSignal<ApiShop[] | null>
  filters: WritableSignal<ShopFilters>
}

export function createCardShopOffersState(): CardShopOffersState {
  return {
    offers: signal<ApiShop[] | null>(null),
    filters: signal<ShopFilters>({
      shop: [],
      seller: [],
      country: [],
      continent: [],
      locale: [],
      set: [],
    }),
  }
}

export const CARD_SHOP_OFFERS_CONTEXT = new InjectionToken<{
  card: ApiCrypt | ApiLibrary
  state: CardShopOffersState
}>('Card shop offers context')

@UntilDestroy()
@Component({
  selector: 'app-card-shop-offers-modal',
  templateUrl: './card-shop-offers-modal.component.html',
  styleUrl: './card-shop-offers-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    TitleCasePipe,
    TranslocoDirective,
    TranslocoPipe,
    CountryPipe,
    LocalePipe,
    FilterChipsComponent,
    NgbTooltip,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    SetTooltipComponent,
    NgxGoogleAnalyticsModule,
  ],
})
export class CardShopOffersModalComponent implements OnInit {
  private static nextFiltersId = 0
  private readonly context = inject(CARD_SHOP_OFFERS_CONTEXT)
  readonly modal = inject(NgbActiveModal)
  readonly card = this.context.card
  readonly connection = inject(ConnectivityService)
  private readonly apiDataService = inject(ApiDataService)
  private readonly setQuery = inject(SetQuery)
  private readonly translocoService = inject(TranslocoService)
  readonly activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  })
  readonly loading = signal(false)
  readonly shopLoadError = signal(false)
  readonly cardShops = this.context.state.offers
  readonly shopFilterKeys: readonly ShopFilterKey[] = [
    'shop',
    'seller',
    'country',
    'continent',
    'locale',
    'set',
  ]
  readonly shopFilters = this.context.state.filters
  readonly identityFilters: readonly ShopFilterKey[] = [
    'shop',
    'seller',
    'country',
    'continent',
  ]
  readonly printingFilters: readonly ShopFilterKey[] = ['set']
  readonly languageFilters: readonly ShopFilterKey[] = ['locale']
  readonly shopFiltersPanelId = `card-shop-filters-${CardShopOffersModalComponent.nextFiltersId++}`
  readonly hasShopFilters = computed(() =>
    this.shopFilterKeys.some((key) => this.shopFilters()[key].length > 0),
  )
  readonly shopFilterOptions = computed(() => {
    const shops = this.cardShops() ?? []
    const language = this.activeLanguage()
    const collator = new Intl.Collator(language, { sensitivity: 'base' })
    return this.shopFilterKeys.map((key) => {
      const options = new Map<string, string>()
      for (const shop of shops) {
        const value = this.shopFilterValue(shop, key)
        if (value) {
          options.set(value, this.shopFilterLabel(shop, key, value, language))
        }
      }
      return {
        key,
        options: [...options]
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => collator.compare(a.label, b.label)),
      }
    })
  })
  readonly shopFilterChips = computed<FilterChip[]>(() => {
    const filters = this.shopFilters()
    const language = this.activeLanguage()
    return this.shopFilterOptions().flatMap((filter) =>
      filters[filter.key].map((value) => ({
        id: JSON.stringify([filter.key, value]),
        key: filter.key,
        item: value,
        label: this.translocoService.translate(
          `deck_shared.shop_filters.${filter.key}`,
          {},
          language,
        ),
        value:
          filter.options.find((option) => option.value === value)?.label ??
          value,
      })),
    )
  })
  readonly filteredShops = computed(() => {
    const shops = this.cardShops() ?? []
    const filters = this.shopFilters()
    return shops.filter((shop) =>
      this.shopFilterKeys.every(
        (key) =>
          filters[key].length === 0 ||
          filters[key].includes(this.shopFilterValue(shop, key)),
      ),
    )
  })
  private readonly failedLocationFlags = signal<ReadonlySet<string>>(new Set())

  setShopFilter(key: ShopFilterKey, values: readonly string[]): void {
    this.shopFilters.update((filters) => ({
      ...filters,
      [key]: [...new Set(values)],
    }))
  }

  toggleShopFilter(key: ShopFilterKey, value: string): void {
    const values = this.shopFilters()[key]
    this.setShopFilter(
      key,
      values.includes(value)
        ? values.filter((selected) => selected !== value)
        : [...values, value],
    )
  }

  filterSelectionCount(keys: readonly ShopFilterKey[]): number {
    return keys.reduce(
      (total, key) => total + this.shopFilters()[key].length,
      0,
    )
  }

  filtersUnavailable(keys: readonly ShopFilterKey[]): boolean {
    return keys.every((key) => this.optionsForFilter(key).length === 0)
  }

  clearShopFilters(): void {
    this.shopFilters.set(this.emptyShopFilters())
  }

  removeShopFilter(chip: FilterChip): void {
    const key = this.shopFilterKeys.find((key) => key === chip.key)
    if (key && chip.item !== undefined) {
      this.setShopFilter(
        key,
        this.shopFilters()[key].filter((value) => value !== chip.item),
      )
    }
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

  private emptyShopFilters(): ShopFilters {
    return {
      shop: [],
      seller: [],
      country: [],
      continent: [],
      locale: [],
      set: [],
    }
  }

  private shopFilterValue(shop: ApiShop, key: ShopFilterKey): string {
    if (key === 'shop') {
      return shop.shopInfo.name.trim()
    }
    const value = shop[key]?.trim() ?? ''
    if (key === 'country' || key === 'continent') {
      return value.toUpperCase()
    }
    return key === 'locale' ? value.toLowerCase() : value
  }

  private shopFilterLabel(
    shop: ApiShop,
    key: ShopFilterKey,
    value: string,
    language: string,
  ): string {
    switch (key) {
      case 'shop':
        return shop.shopInfo.fullName || value
      case 'country':
        return getRegionDisplayName(value, language, key) ?? value
      case 'continent':
        return this.continentName(value, language)
      case 'locale':
        return getLocaleDisplayName(value) ?? value
      case 'set':
        return this.printingName(value)
      default:
        return value
    }
  }

  continentName(continent: string, language = this.activeLanguage()): string {
    const code = continent.trim().toUpperCase()
    return SHOP_CONTINENTS.has(code)
      ? this.translocoService.translate(
          `deck_shared.shop_filters.continent_names.${code}`,
          {},
          language,
        )
      : code
  }

  printingName(value: string): string {
    const abbrev = getSetAbbrev(value)
    const name = this.setQuery.getEntityByAbbrev(abbrev)?.fullName
    if (!name) {
      return value
    }
    const suffix = value.slice(abbrev.length + 1).trim()
    return suffix ? `${name}: ${suffix}` : name
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

  ngOnInit(): void {
    this.loadShopOffers()
  }

  optionsForFilter(key: ShopFilterKey) {
    return (
      this.shopFilterOptions().find((filter) => filter.key === key)?.options ??
      []
    )
  }

  filterValue(key: ShopFilterKey): readonly string[] {
    return this.shopFilters()[key]
  }

  @HostListener('keydown', ['$event'])
  onNavigationKey(event: KeyboardEvent): void {
    if (event.key.startsWith('Arrow')) {
      event.stopPropagation()
    }
  }

  loadShopOffers(): void {
    if (
      this.loading() ||
      this.connection.offline() ||
      this.cardShops() !== null
    ) {
      return
    }
    this.loading.set(true)
    this.shopLoadError.set(false)
    this.apiDataService
      .getCardShops(this.card.id, true)
      .pipe(
        untilDestroyed(this),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (shops) => this.cardShops.set(shops),
        error: () => this.shopLoadError.set(true),
      })
  }
}
