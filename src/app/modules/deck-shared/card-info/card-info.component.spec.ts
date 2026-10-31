import { NO_ERRORS_SCHEMA, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { ApiCardInfo, ApiLibrary, ApiSet, ApiShop } from '@models'
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, MediaService } from '@services'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { Observable, of, Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../../services/connectivity.service'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { WishlistCardStatsComponent } from '../wishlist-card-stats/wishlist-card-stats.component'
import { CardInfoComponent } from './card-info.component'
import { SetQuery } from '@state/set/set.query'
import { CardShopOffersModalComponent } from '../card-shop-offers-modal/card-shop-offers-modal.component'

describe('Card shop offers', () => {
  afterEach(() => TestBed.resetTestingModule())

  function offer(id: number, metadata: Partial<ApiShop> = {}): ApiShop {
    return {
      cardId: 100545,
      shopInfo: {
        name: 'EBAY',
        fullName: 'eBay',
        baseUrl: 'https://ebay.com',
        showButton: false,
      },
      link: `https://example.com/offers/${id}`,
      set: 'Jyhad',
      locale: 'en',
      price: id,
      currency: 'EUR',
      inStock: true,
      ...metadata,
    }
  }

  async function setup(
    shops: ApiShop[],
    hasMoreShops = false,
    all = shops,
    cardInfoOverrides: Partial<ApiCardInfo> = {},
  ) {
    const getCardShops = vi.fn<() => Observable<ApiShop[]>>(() => of(all))
    const offline = signal(false)
    const sets = signal<ApiSet[]>([])
    const getSetByAbbrev = vi.fn((abbrev: string) =>
      sets().find((set) => set.abbrev.toLowerCase() === abbrev.toLowerCase()),
    )
    const translations = {
      shared: {
        active_filters: 'Active filters',
        remove_filter: 'Remove filter: {{ filter }}',
        clear_all: 'Clear all',
        close: 'Close',
      },
      deck_shared: {
        sets: 'Sets',
        rulings: 'Rulings',
        no_rulings: 'No rulings',
        where_find: 'Where to buy',
        show_more: 'Show more',
        ebay_affiliate_disclosure: 'Affiliate links',
        shop_filters: {
          location: 'Location',
          price: 'Price',
          in_stock: 'In stock',
          out_of_stock: 'Out of stock',
          offers_title: 'Offers for {{ name }}',
          retry: 'Try again',
          shop: 'Shop',
          seller: 'Seller',
          country: 'Country',
          continent: 'Continent',
          continent_names: {
            AF: 'Africa',
            AN: 'Antarctica',
            AS: 'Asia',
            EU: 'Europe',
            NA: 'North America',
            OC: 'Oceania',
            SA: 'South America',
          },
          locale: 'Language',
          set: 'Printing',
          all: 'All',
          count: '{{ shown }} of {{ total }} offers',
          empty: 'No offers match these filters.',
          load_error: 'Offers could not be loaded. Please try again.',
        },
      },
    }
    TestBed.configureTestingModule({
      imports: [
        CardInfoComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: translations,
            es: {
              shared: translations.shared,
              deck_shared: {
                ...translations.deck_shared,
                shop_filters: {
                  ...translations.deck_shared.shop_filters,
                  country: 'País',
                  continent_names: {
                    ...translations.deck_shared.shop_filters.continent_names,
                    EU: 'Europa',
                  },
                  count: '{{ shown }} de {{ total }} ofertas',
                },
              },
            },
          },
          translocoConfig: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: ApiDataService, useValue: { getCardShops } },
        { provide: MediaService, useValue: { observeMobile: () => of(false) } },
        { provide: ConnectivityService, useValue: { offline } },
        { provide: SetQuery, useValue: { getEntityByAbbrev: getSetByAbbrev } },
      ],
    }).overrideComponent(CardInfoComponent, {
      remove: {
        imports: [
          CollectionCardStatsComponent,
          WishlistCardStatsComponent,
          RulingTextComponent,
          SetTooltipComponent,
          NgxGoogleAnalyticsModule,
        ],
      },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    })
    TestBed.overrideComponent(CardShopOffersModalComponent, {
      remove: { imports: [SetTooltipComponent, NgxGoogleAnalyticsModule] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    })
    TestBed.inject(NgbConfig).animation = false
    vi.spyOn(TestBed.inject(NgbModal), 'open')
    const fixture = TestBed.createComponent(CardInfoComponent)
    fixture.componentRef.setInput('card', {
      id: 100545,
      name: 'Direct Intervention',
      artist: '',
      sets: [],
    } as unknown as ApiLibrary)
    fixture.componentRef.setInput('cardInfo', {
      shopList: shops,
      preconstructedDecks: [],
      rulingList: [],
      errataList: [],
      hasMoreShops,
      ...cardInfoOverrides,
    } as unknown as ApiCardInfo)
    fixture.componentInstance.shopsCollapsed = false
    await fixture.whenStable()
    return { fixture, getCardShops, offline, sets, getSetByAbbrev }
  }

  function offersComponent(): CardShopOffersModalComponent {
    const result = vi.mocked(TestBed.inject(NgbModal).open).mock.results.at(-1)
    if (result?.type !== 'return') {
      throw new Error('No offers modal is open')
    }
    return result.value.componentInstance as CardShopOffersModalComponent
  }

  function shopRoot(fixture: ComponentFixture<CardInfoComponent>) {
    return (
      document.querySelector<HTMLElement>('.card-shops-modal') ??
      fixture.nativeElement
    )
  }

  async function loadMore(fixture: ComponentFixture<CardInfoComponent>) {
    fixture.nativeElement.querySelector('.shop-load-more').click()
    await fixture.whenStable()
  }

  function filterButtons(key: string): HTMLButtonElement[] {
    return Array.from(
      document.querySelectorAll(
        `[data-shop-filter="${key}"] [data-shop-filter-value]`,
      ),
    )
  }

  function selectedValues(key: string): string[] {
    return filterButtons(key)
      .filter((button) => button.getAttribute('aria-checked') === 'true')
      .map((button) => button.getAttribute('data-shop-filter-value')!)
      .filter(Boolean)
  }

  async function openFilter(
    fixture: ComponentFixture<CardInfoComponent>,
    key: string,
  ) {
    const group = ['shop', 'seller', 'country', 'continent'].includes(key)
      ? 'identity'
      : key === 'set'
        ? 'printing'
        : 'language'
    const trigger: HTMLButtonElement = shopRoot(fixture).querySelector(
      `[data-shop-filter-trigger="${group}"]`,
    )
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      trigger.click()
      await fixture.whenStable()
    }
    return trigger
  }

  async function selectFilter(
    fixture: ComponentFixture<CardInfoComponent>,
    key: string,
    value: string | string[],
  ) {
    await openFilter(fixture, key)
    filterButtons(key)
      .find((button) => button.getAttribute('data-shop-filter-value') === '')!
      .click()
    await fixture.whenStable()
    const values = Array.isArray(value) ? value : value ? [value] : []
    for (const selected of values) {
      const button = filterButtons(key).find(
        (button) => button.getAttribute('data-shop-filter-value') === selected,
      )
      if (!button) {
        throw new Error(`Missing ${key} option ${selected}`)
      }
      button.click()
      await fixture.whenStable()
    }
  }

  function visibleOffers(fixture: ComponentFixture<CardInfoComponent>) {
    return Array.from<HTMLAnchorElement>(
      shopRoot(fixture).querySelectorAll('.shop-offer'),
    ).map((link) => link.href)
  }

  it('places the flag inside the badge and localizes the accessible country name', async () => {
    const longSeller = 'a-long-seller-name-'.repeat(8)
    const offers = [
      offer(1, { seller: longSeller, country: 'ES', continent: 'EU' }),
      offer(2, { seller: 'another-seller', country: 'US', continent: 'NA' }),
    ]
    const { fixture } = await setup([offers[0]], true, offers)

    const links: HTMLAnchorElement[] = Array.from(
      shopRoot(fixture).querySelectorAll('.shop-offer'),
    )
    expect(links).toHaveLength(1)
    expect(links[0].textContent).toContain(longSeller)
    expect(links[0].href).toBe('https://example.com/offers/1')
    expect(links[0].textContent).toContain('Jyhad')
    const country = links[0].querySelector('.shop-country')!
    const badge = links[0].querySelector('.shop-offer-label')!
    expect(country.parentElement).toBe(badge)
    expect(badge.firstElementChild).toBe(country)
    expect(country.getAttribute('aria-label')).toBe('Spain')
    expect(country.getAttribute('title')).toBe('Spain')
    expect(country.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w40/es.png',
    )
    expect(
      links[0].querySelector('.shop-offer-details')?.textContent,
    ).not.toContain('Spain')

    TestBed.inject(TranslocoService).setActiveLang('es')
    await fixture.whenStable()

    expect(country.getAttribute('aria-label')).toBe('España')
    expect(country.getAttribute('title')).toBe('España')
  })

  it('shows the uppercase country code when a flag image is unavailable', async () => {
    const { fixture } = await setup([
      offer(1, { country: 'mx', continent: 'NA' }),
    ])
    const country: HTMLElement =
      shopRoot(fixture).querySelector('.shop-country')
    const image = country.querySelector('img')!
    expect(image.getAttribute('src')).toBe('https://flagcdn.com/w40/mx.png')

    image.dispatchEvent(new Event('error'))
    await fixture.whenStable()

    expect(country.querySelector('img')).toBeNull()
    expect(country.textContent?.trim()).toBe('MX')
    expect(country.getAttribute('aria-label')).toBe('Mexico')
  })

  it('uses the European flag and localized continent name when country is missing', async () => {
    const { fixture } = await setup([
      offer(1, { country: ' ', continent: ' eu ' }),
    ])
    const location: HTMLElement =
      shopRoot(fixture).querySelector('.shop-country')

    expect(location.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w40/eu.png',
    )
    expect(location.getAttribute('aria-label')).toBe('Europe')
    expect(location.getAttribute('title')).toBe('Europe')

    TestBed.inject(TranslocoService).setActiveLang('es')
    await fixture.whenStable()

    expect(location.getAttribute('aria-label')).toBe('Europa')
    expect(location.getAttribute('title')).toBe('Europa')
  })

  it.each([
    ['NA', 'North America'],
    ['SA', 'South America'],
    ['AF', 'Africa'],
    ['AS', 'Asia'],
    ['OC', 'Oceania'],
    ['AN', 'Antarctica'],
    ['ZZ', 'ZZ'],
  ])(
    'shows %s as a continent instead of requesting a country flag',
    async (code, name) => {
      const { fixture } = await setup([offer(1, { continent: code })])
      const location: HTMLElement =
        shopRoot(fixture).querySelector('.shop-country')

      expect(location.querySelector('img')).toBeNull()
      expect(location.querySelector('.bi-globe2')).not.toBeNull()
      expect(location.textContent?.trim()).toBe(code)
      expect(location.getAttribute('aria-label')).toBe(name)
      expect(location.getAttribute('title')).toBe(name)
    },
  )

  it('falls back to the continent code if the European flag fails to load', async () => {
    const { fixture } = await setup([offer(1, { continent: 'EU' })])
    const location: HTMLElement =
      shopRoot(fixture).querySelector('.shop-country')

    location.querySelector('img')!.dispatchEvent(new Event('error'))
    await fixture.whenStable()

    expect(location.querySelector('img')).toBeNull()
    expect(location.querySelector('.bi-globe2')).not.toBeNull()
    expect(location.textContent?.trim()).toBe('EU')
    expect(location.getAttribute('aria-label')).toBe('Europe')
  })

  it('shows an invalid country code without requesting a flag image', async () => {
    const { fixture } = await setup([offer(1, { country: 'abc' })])
    const country: HTMLElement =
      shopRoot(fixture).querySelector('.shop-country')

    expect(country.querySelector('img')).toBeNull()
    expect(country.textContent?.trim()).toBe('ABC')
  })

  it('supports responses without the new optional metadata', async () => {
    const { fixture } = await setup([offer(1)])
    const link: HTMLAnchorElement =
      shopRoot(fixture).querySelector('.shop-offer')

    expect(link.textContent).toContain('eBay')
    expect(link.textContent).toContain('Jyhad')
    expect(link.querySelector('.shop-country')).toBeNull()
    expect(link.textContent).not.toContain('undefined')
    expect(link.textContent).not.toContain('null')
  })

  it.each(['DTC', 'GP', 'TCG_MKT', 'CGG'])(
    'shows the supplied seller for %s offers',
    async (platform) => {
      const { fixture } = await setup([
        offer(1, {
          seller: 'Example seller',
          shopInfo: {
            name: platform,
            fullName: platform,
            baseUrl: 'https://example.com',
            showButton: false,
          },
        }),
      ])

      expect(
        shopRoot(fixture).querySelector('.shop-offer-label').textContent,
      ).toContain('Example seller')
    },
  )

  it('starts with one eBay seller and reveals the others on Show more', async () => {
    const initial = [offer(1, { seller: 'first' })]
    const all = [
      ...initial,
      offer(2, { seller: 'second' }),
      offer(3, {
        seller: 'tcgmarket',
        country: 'ES',
        shopInfo: {
          name: 'TCG_MKT',
          fullName: 'TCG Market',
          baseUrl: 'https://tcgmarket.es',
          showButton: false,
        },
      }),
    ]
    const { fixture, getCardShops } = await setup(initial, true, all)
    const button: HTMLButtonElement = shopRoot(fixture).querySelector('button')

    expect(shopRoot(fixture).querySelectorAll('.shop-offer')).toHaveLength(1)
    expect(shopRoot(fixture).textContent).toContain('first')
    expect(shopRoot(fixture).textContent).not.toContain('second')
    button.click()
    await fixture.whenStable()

    expect(getCardShops).toHaveBeenCalledExactlyOnceWith(100545, true)
    expect(shopRoot(fixture).querySelectorAll('.shop-offer')).toHaveLength(3)
    expect(shopRoot(fixture).textContent).toContain('first')
    expect(shopRoot(fixture).textContent).toContain('second')
    const extra: HTMLAnchorElement =
      shopRoot(fixture).querySelectorAll('.shop-offer')[2]
    expect(extra.textContent).toContain('TCG Market')
    expect(extra.textContent).toContain('tcgmarket')
    expect(
      extra
        .closest('tr')!
        .querySelector('.shop-country')
        ?.getAttribute('aria-label'),
    ).toBe('Spain')
    expect(
      extra.closest('tr')!.querySelector('.shop-country img'),
    ).not.toBeNull()
    expect(shopRoot(fixture).querySelector('.shop-load-more')).toBeNull()
  })

  it('opens a separate offers modal with compact multi-select filter menus', async () => {
    const all = [offer(2, { country: 'FR' }), offer(1, { country: 'ES' })]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    const response = new Subject<ApiShop[]>()
    getCardShops.mockReturnValueOnce(response)

    expect(shopRoot(fixture).querySelector('.shop-filters')).toBeNull()
    await loadMore(fixture)
    await loadMore(fixture)
    expect(getCardShops).toHaveBeenCalledTimes(1)
    expect(shopRoot(fixture).querySelector('.shop-filters')).not.toBeNull()
    expect(shopRoot(fixture).querySelector('.spinner-border')).not.toBeNull()

    response.next(all)
    response.complete()
    await fixture.whenStable()

    expect(
      shopRoot(fixture).querySelectorAll('[data-shop-filter-trigger]'),
    ).toHaveLength(3)
    expect(
      Array.from(document.querySelectorAll('[data-shop-filter]'))
        .map((group) => group.getAttribute('data-shop-filter'))
        .sort(),
    ).toEqual(['continent', 'country', 'locale', 'seller', 'set', 'shop'])
    for (const key of [
      'shop',
      'seller',
      'country',
      'continent',
      'locale',
      'set',
    ]) {
      expect(filterButtons(key)[0].getAttribute('role')).toBe(
        'menuitemcheckbox',
      )
      expect(filterButtons(key)[0].getAttribute('aria-checked')).toBe('true')
    }
    expect(visibleOffers(fixture)).toEqual(all.map((shop) => shop.link))
    expect(
      shopRoot(fixture).querySelector('.shop-filter-count').textContent,
    ).toContain('2 of 2 offers')
    expect(shopRoot(fixture).querySelector('.filter-chips__clear')).toBeNull()
  })

  it.each([
    ['shop', 'TCG_MKT'],
    ['seller', 'selected seller'],
    ['country', 'ES'],
    ['continent', 'EU'],
    ['locale', 'es'],
    ['set', 'Vampire: The Eternal Struggle'],
  ])('filters offers by %s without fetching again', async (key, value) => {
    const selected = offer(2, {
      shopInfo: {
        ...offer(1).shopInfo,
        name: 'TCG_MKT',
        fullName: 'TCG Market',
      },
      seller: 'selected seller',
      country: ' es ',
      continent: ' eu ',
      locale: 'ES',
      set: 'Vampire: The Eternal Struggle',
      inStock: false,
    })
    const all = [
      offer(1, { seller: 'other', country: 'US', continent: 'NA' }),
      selected,
    ]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, key, value)

    expect(visibleOffers(fixture)).toEqual([selected.link])
    expect(
      shopRoot(fixture).querySelector('.shop-filter-count').textContent,
    ).toContain('1 of 2 offers')
    expect(
      shopRoot(fixture).querySelector('.filter-chips__clear'),
    ).not.toBeNull()
    expect(getCardShops).toHaveBeenCalledTimes(1)
  })

  it('combines filters with AND and keeps all options until Clear restores the original order', async () => {
    const all = [
      offer(3, { country: 'ES', seller: 'first' }),
      offer(1, { country: 'US', seller: 'second' }),
      offer(2, { country: 'ES', seller: 'second' }),
    ]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'country', 'ES')
    await selectFilter(fixture, 'seller', 'second')
    expect(visibleOffers(fixture)).toEqual([all[2].link])
    const options = (key: string) =>
      filterButtons(key).map((button) =>
        button.getAttribute('data-shop-filter-value'),
      )
    expect(options('country')).toEqual(['', 'ES', 'US'])
    expect(options('seller')).toEqual(['', 'first', 'second'])

    await selectFilter(fixture, 'seller', 'first')
    await selectFilter(fixture, 'country', 'US')
    expect(visibleOffers(fixture)).toEqual([])
    expect(
      shopRoot(fixture).querySelector('.shop-filters-empty').textContent,
    ).toContain('No offers match')
    expect(
      shopRoot(fixture).querySelector('.shop-filter-count').textContent,
    ).toContain('0 of 3 offers')
    shopRoot(fixture).querySelector('.filter-chips__clear').click()
    await fixture.whenStable()

    expect(visibleOffers(fixture)).toEqual(all.map((shop) => shop.link))
    expect(shopRoot(fixture).querySelector('.shop-filters-empty')).toBeNull()
    expect(shopRoot(fixture).querySelector('.filter-chips__clear')).toBeNull()
    expect(selectedValues('country')).toEqual([])
    expect(getCardShops).toHaveBeenCalledTimes(1)
  })

  it('deduplicates normalized metadata, sorts labels and excludes missing metadata only for selected filters', async () => {
    const all = [
      offer(1, { country: 'US', continent: 'NA', seller: 'Zulu' }),
      offer(2, { country: ' es ', continent: ' eu ', seller: 'Alpha' }),
      offer(3, { country: 'ES', continent: 'EU', seller: 'Alpha' }),
      offer(4, { seller: ' ', set: undefined, locale: undefined }),
    ]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    const optionLabels = (key: string) =>
      filterButtons(key).map((button) => button.textContent?.trim())
    expect(optionLabels('country')).toEqual(['All', 'Spain', 'United States'])
    expect(optionLabels('continent')).toEqual([
      'All',
      'Europe',
      'North America',
    ])
    expect(optionLabels('seller')).toEqual(['All', 'Alpha', 'Zulu'])
    expect(visibleOffers(fixture)).toHaveLength(4)
    await selectFilter(fixture, 'country', 'ES')
    expect(visibleOffers(fixture)).toEqual([all[1].link, all[2].link])
    await selectFilter(fixture, 'country', '')
    expect(visibleOffers(fixture)).toHaveLength(4)
  })

  it('disables only filters without values and keeps unknown continent codes as labels', async () => {
    const all = [
      offer(1, { locale: undefined, set: undefined, continent: 'ZZ' }),
    ]
    const { fixture } = await setup(all, true)
    await loadMore(fixture)
    for (const key of ['seller', 'country', 'locale', 'set']) {
      expect(filterButtons(key)[0].disabled).toBe(true)
    }
    expect(filterButtons('shop')[0].disabled).toBe(false)
    expect(filterButtons('continent')[0].disabled).toBe(false)
    expect(
      filterButtons('continent')
        .find(
          (button) => button.getAttribute('data-shop-filter-value') === 'ZZ',
        )
        ?.textContent?.trim(),
    ).toBe('ZZ')
  })

  it('keeps preconstructed decks, the header total and the price range unchanged by filtering', async () => {
    const all = [offer(1, { country: 'ES' }), offer(2, { country: 'US' })]
    const { fixture } = await setup([all[0]], true, all, {
      preconstructedDecks: [
        {
          id: 'precon',
          name: 'Starter deck',
          year: 2026,
          filterCards: [{ number: 2 }],
          stats: { msrp: 20, currency: 'EUR' },
        },
      ] as unknown as ApiCardInfo['preconstructedDecks'],
      minPrice: 1,
      maxPrice: 2,
      currency: 'EUR',
    })
    await loadMore(fixture)
    const header: HTMLElement = fixture.nativeElement.querySelector(
      '.card-header.bg-success',
    )
    const before = header.textContent
    await selectFilter(fixture, 'country', 'ES')
    expect(header.textContent).toBe(before)
    expect(header.querySelector('.badge.bg-dark')?.textContent?.trim()).toBe(
      '2',
    )
    expect(
      fixture.nativeElement.querySelector('a[href="/deck/precon"]').textContent,
    ).toContain('Starter deck')
  })

  it('retains selections when collapsed or the same card is refreshed, and resets them for another card', async () => {
    const all = [offer(1, { country: 'ES' }), offer(2, { country: 'US' })]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'country', 'ES')
    const header: HTMLElement = fixture.nativeElement.querySelector(
      '.card-header.bg-success',
    )
    header.click()
    await fixture.whenStable()
    header.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))
    fixture.componentRef.setInput('card', {
      ...fixture.componentInstance.card(),
    })
    await fixture.whenStable()
    expect(fixture.componentInstance.shopsCollapsed).toBe(false)
    expect(selectedValues('country')).toEqual(['ES'])
    expect(visibleOffers(fixture)).toEqual([all[0].link])

    fixture.componentRef.setInput('card', {
      ...fixture.componentInstance.card(),
      id: 100546,
    })
    fixture.componentRef.setInput('cardInfo', {
      ...fixture.componentInstance.cardInfo(),
      shopList: [offer(3, { cardId: 100546, country: 'FR' })],
      hasMoreShops: true,
    })
    await fixture.whenStable()
    expect(shopRoot(fixture).querySelector('.shop-filters')).toBeNull()
    expect(document.querySelector('.card-shops-modal')).toBeNull()
    expect(visibleOffers(fixture)).toEqual([offer(3).link])
  })

  it('cancels a previous card request without changing the next card loading state or offers', async () => {
    const { fixture, getCardShops } = await setup([offer(1)], true)
    const first = new Subject<ApiShop[]>()
    const second = new Subject<ApiShop[]>()
    getCardShops.mockReturnValueOnce(first).mockReturnValueOnce(second)
    await loadMore(fixture)
    fixture.componentRef.setInput('card', {
      ...fixture.componentInstance.card(),
      id: 100546,
    })
    fixture.componentRef.setInput('cardInfo', {
      ...fixture.componentInstance.cardInfo(),
      shopList: [offer(2, { cardId: 100546 })],
      hasMoreShops: true,
    })
    await fixture.whenStable()
    expect(first.observed).toBe(false)
    await loadMore(fixture)
    first.next([offer(3)])
    first.complete()
    await fixture.whenStable()
    expect(offersComponent().loading()).toBe(true)
    expect(shopRoot(fixture).querySelector('.spinner-border')).not.toBeNull()
    expect(visibleOffers(fixture)).toEqual([])
    expect(fixture.nativeElement.querySelector('.shop-offer').href).toBe(
      offer(2).link,
    )

    second.next([offer(4, { cardId: 100546 })])
    second.complete()
    await fixture.whenStable()
    expect(visibleOffers(fixture)).toEqual([offer(4).link])
    expect(offersComponent().loading()).toBe(false)
    expect(getCardShops.mock.calls).toEqual([
      [100545, true],
      [100546, true],
    ])
  })

  it('retains the summary after a failed load and reveals filters on a successful retry', async () => {
    const { fixture, getCardShops } = await setup([offer(1)], true)
    const failed = new Subject<ApiShop[]>()
    getCardShops.mockReturnValueOnce(failed)
    await loadMore(fixture)
    failed.error(new Error('Unavailable'))
    await fixture.whenStable()
    expect(shopRoot(fixture).querySelector('.shop-filter-count')).toBeNull()
    expect(visibleOffers(fixture)).toEqual([])
    expect(fixture.nativeElement.querySelector('.shop-offer').href).toBe(
      offer(1).link,
    )
    expect(
      shopRoot(fixture).querySelector('[role="alert"]').textContent,
    ).toContain('Please try again')
    expect(
      shopRoot(fixture).querySelector('.shop-offers-retry')!.disabled,
    ).toBe(false)
    shopRoot(fixture).querySelector('.shop-offers-retry')!.click()
    await fixture.whenStable()
    expect(shopRoot(fixture).querySelector('.shop-filters')).not.toBeNull()
    expect(shopRoot(fixture).querySelector('[role="alert"]')).toBeNull()
  })

  it('keeps the filter bar and counter visible for an empty complete response', async () => {
    const { fixture } = await setup([offer(1)], true, [])
    await loadMore(fixture)
    expect(shopRoot(fixture).querySelector('.shop-filters')).not.toBeNull()
    expect(
      shopRoot(fixture).querySelector('.shop-filter-count').textContent,
    ).toContain('0 of 0 offers')
    expect(
      shopRoot(fixture).querySelector('.shop-filters-empty'),
    ).not.toBeNull()
    expect(shopRoot(fixture).querySelector('.shop-load-more')).toBeNull()
  })

  it('accepts a complete list even when the initial summary has no individual offers', async () => {
    const { fixture } = await setup([], true, [offer(1)], {
      preconstructedDecks: [
        { id: 'precon', stats: { msrp: 20, currency: 'EUR' } },
      ] as unknown as ApiCardInfo['preconstructedDecks'],
    })
    await loadMore(fixture)
    expect(visibleOffers(fixture)).toEqual([offer(1).link])
    expect(shopRoot(fixture).querySelector('.shop-filters')).not.toBeNull()
  })

  it('updates localized labels and counters without losing selections', async () => {
    const all = [
      offer(1, { country: 'ES', continent: 'EU' }),
      offer(2, { country: 'US' }),
    ]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'country', 'ES')
    TestBed.inject(TranslocoService).setActiveLang('es')
    await fixture.whenStable()
    const country = filterButtons('country').find(
      (button) => button.getAttribute('data-shop-filter-value') === 'ES',
    )!
    expect(
      document.querySelector('[data-shop-filter="country"] .dropdown-header')
        ?.textContent,
    ).toContain('País')
    expect(selectedValues('country')).toEqual(['ES'])
    expect(country.textContent?.trim()).toBe('España')
    expect(
      filterButtons('continent')
        .find(
          (button) => button.getAttribute('data-shop-filter-value') === 'EU',
        )
        ?.textContent?.trim(),
    ).toBe('Europa')
    expect(
      shopRoot(fixture).querySelector('.shop-filter-count').textContent,
    ).toContain('1 de 2 ofertas')
    expect(visibleOffers(fixture)).toEqual([all[0].link])
  })

  it('hides network-dependent details offline and makes no new request', async () => {
    const { fixture, getCardShops, offline } = await setup([offer(1)], true)
    offline.set(true)
    await fixture.whenStable()
    fixture.componentInstance.onLoadMoreShops()
    expect(getCardShops).not.toHaveBeenCalled()
    expect(shopRoot(fixture).querySelector('.shop-filters')).toBeNull()
  })

  it('keeps the summary compact and reuses offers and selections when the modal is reopened', async () => {
    const all = [offer(1, { country: 'ES' }), offer(2, { country: 'US' })]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    await loadMore(fixture)
    const modal = document.querySelector<HTMLElement>('.card-shops-modal')!
    expect(fixture.nativeElement.contains(modal)).toBe(false)
    expect(modal.querySelector('.modal-title')?.textContent).toContain(
      'Direct Intervention',
    )
    expect(fixture.nativeElement.querySelectorAll('.shop-offer')).toHaveLength(
      1,
    )
    expect(fixture.nativeElement.querySelector('.shop-filters')).toBeNull()
    expect(
      fixture.nativeElement
        .querySelector('.card-header.bg-success .badge.bg-dark')
        .textContent.trim(),
    ).toBe('1')
    expect(modal.querySelectorAll('.shop-offer')).toHaveLength(2)
    await selectFilter(fixture, 'country', 'ES')
    modal.querySelector<HTMLButtonElement>('.modal-footer button')!.click()
    await fixture.whenStable()
    expect(document.querySelector('.card-shops-modal')).toBeNull()
    expect(visibleOffers(fixture)).toEqual([all[0].link])
    await loadMore(fixture)
    expect(visibleOffers(fixture)).toEqual([all[0].link])
    expect(selectedValues('country')).toEqual(['ES'])
    expect(getCardShops).toHaveBeenCalledTimes(1)
  })

  it('removes individual selections through the shared chips while preserving other filters', async () => {
    const all = [
      offer(1, { country: 'ES', seller: 'first' }),
      offer(2, { country: 'US', seller: 'second' }),
      offer(3, { country: 'ES', seller: 'second' }),
    ]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'country', 'ES')
    await selectFilter(fixture, 'seller', 'second')
    expect(shopRoot(fixture).querySelectorAll('.filter-chip')).toHaveLength(2)
    expect(visibleOffers(fixture)).toEqual([all[2].link])
    const removeCountry: HTMLButtonElement = shopRoot(fixture).querySelector(
      '.filter-chip__close[aria-label*="Country"]',
    )
    expect(removeCountry.getAttribute('aria-label')).toContain('Spain')
    removeCountry.click()
    await fixture.whenStable()
    expect(visibleOffers(fixture)).toEqual([all[1].link, all[2].link])
    expect(shopRoot(fixture).querySelectorAll('.filter-chip')).toHaveLength(1)
    expect(selectedValues('seller')).toEqual(['second'])
    expect(selectedValues('country')).toEqual([])
    shopRoot(fixture).querySelector('.filter-chips__clear').click()
    await fixture.whenStable()
    expect(visibleOffers(fixture)).toEqual(all.map((shop) => shop.link))
    expect(shopRoot(fixture).querySelector('.filter-chip')).toBeNull()
    expect(getCardShops).toHaveBeenCalledTimes(1)
  })

  it('closes the offers modal and cancels its request when CardInfo is destroyed', async () => {
    const { fixture, getCardShops } = await setup([offer(1)], true)
    const response = new Subject<ApiShop[]>()
    getCardShops.mockReturnValueOnce(response)
    await loadMore(fixture)
    expect(document.querySelector('.card-shops-modal')).not.toBeNull()
    expect(response.observed).toBe(true)
    fixture.destroy()
    expect(document.querySelector('.card-shops-modal')).toBeNull()
    expect(response.observed).toBe(false)
  })

  it('separates offer metadata into table columns and preserves unavailable offers', async () => {
    const all = [
      offer(1, {
        seller: 'first',
        country: 'ES',
        continent: 'EU',
        inStock: false,
      }),
      offer(2, { continent: 'AS', set: undefined, locale: undefined }),
    ]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    const table: HTMLTableElement = shopRoot(fixture).querySelector('table')
    expect(
      Array.from(table.querySelectorAll('thead th')).map((th) =>
        (
          th.querySelector('.shop-offers-heading')?.textContent ??
          th.textContent
        )
          ?.replace(/\s+/g, ' ')
          .trim(),
      ),
    ).toEqual(['Shop / Seller', 'Printing', 'Language', 'Price'])
    const rows = table.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    const cells = rows[0].querySelectorAll('td')
    expect(cells[0].textContent).toContain('first')
    expect(
      cells[0].querySelector('.shop-country')?.getAttribute('aria-label'),
    ).toBe('Spain')
    expect(cells[1].textContent?.trim()).toBe('Jyhad')
    expect(cells[2].textContent?.trim()).toBe('English')
    expect(cells[3].textContent).toContain('1.00')
    expect(cells[3].textContent).toContain('Out of stock')
    expect(
      rows[1].querySelector('.shop-country')?.getAttribute('aria-label'),
    ).toBe('Asia')
    expect(rows[1].querySelector('.shop-country img')).toBeNull()
    expect(rows[1].querySelectorAll('td')[3].textContent).not.toContain(
      'In stock',
    )
    expect(rows[1].querySelectorAll('td')[1].textContent?.trim()).toBe('—')
  })

  it('keeps the affiliate disclosure in the footer during loading, errors and filtering', async () => {
    const all = [
      offer(1, { country: 'ES' }),
      offer(2, {
        shopInfo: {
          ...offer(1).shopInfo,
          name: 'TCG_MKT',
          fullName: 'TCG Market',
        },
        country: 'US',
      }),
    ]
    const { fixture, getCardShops } = await setup([all[0]], true, all)
    const failed = new Subject<ApiShop[]>()
    getCardShops.mockReturnValueOnce(failed)
    await loadMore(fixture)
    const footer: HTMLElement = shopRoot(fixture).querySelector('.modal-footer')
    expect(footer.textContent).toContain('Affiliate links')
    expect(
      shopRoot(fixture).querySelector('.modal-body').textContent,
    ).not.toContain('Affiliate links')
    failed.error(new Error('Unavailable'))
    await fixture.whenStable()
    expect(footer.textContent).toContain('Affiliate links')
    shopRoot(fixture).querySelector('.shop-offers-retry').click()
    await fixture.whenStable()
    await selectFilter(fixture, 'shop', 'TCG_MKT')
    expect(visibleOffers(fixture)).toEqual([all[1].link])
    expect(footer.textContent).toContain('Affiliate links')
    expect(
      shopRoot(fixture).querySelector('.modal-body').textContent,
    ).not.toContain('Affiliate links')
  })

  it('previews the exact offer printing when the edition receives keyboard focus', async () => {
    const { fixture } = await setup([offer(1, { set: 'PFA:Full art' })], true)
    await loadMore(fixture)
    const printing: HTMLButtonElement =
      shopRoot(fixture).querySelector('.shop-printing')
    printing.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await fixture.whenStable()
    const preview = document.querySelector(
      'ngb-tooltip-window app-set-tooltip',
    ) as
      (HTMLElement & { cardId: number; set: string; showImage: boolean }) | null
    expect(preview).not.toBeNull()
    expect(preview?.cardId).toBe(100545)
    expect(preview?.set).toBe('PFA:Full art')
    expect(preview?.showImage).toBe(true)
    printing.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await fixture.whenStable()
    expect(document.querySelector('ngb-tooltip-window')).toBeNull()
  })

  it.each([true, undefined])(
    'does not show availability warnings for stock value %s',
    async (inStock) => {
      const { fixture } = await setup([offer(1, { inStock })], true)
      await loadMore(fixture)
      const price: HTMLTableCellElement = shopRoot(fixture).querySelector(
        'tbody tr td:last-child',
      )
      expect(price.textContent).not.toContain('In stock')
      expect(price.textContent).not.toContain('Out of stock')
      expect(price.closest('tr')?.classList.contains('opacity-50')).toBe(false)
    },
  )

  it.each([
    { key: 'shop', values: ['EBAY', 'TCG_MKT'] },
    { key: 'seller', values: ['first', 'second'] },
    { key: 'country', values: ['ES', 'US'] },
    { key: 'continent', values: ['EU', 'NA'] },
    { key: 'locale', values: ['en', 'es'] },
    { key: 'set', values: ['Jyhad', 'CE'] },
  ])(
    'supports multiple selections for $key and keeps the menu open',
    async ({ key, values }) => {
      const all = [
        offer(1, {
          seller: 'first',
          country: 'ES',
          continent: 'EU',
          set: 'Jyhad',
          locale: 'en',
        }),
        offer(2, {
          shopInfo: {
            ...offer(1).shopInfo,
            name: 'TCG_MKT',
            fullName: 'TCG Market',
          },
          seller: 'second',
          country: 'US',
          continent: 'NA',
          set: 'CE',
          locale: 'es',
        }),
        offer(3, {
          shopInfo: {
            ...offer(1).shopInfo,
            name: 'CGG',
            fullName: 'CardGameGeek',
          },
          seller: 'third',
          country: 'JP',
          continent: 'AS',
          set: 'Sabbat',
          locale: 'fr',
        }),
      ]
      const { fixture, getCardShops } = await setup([all[0]], true, all)
      await loadMore(fixture)
      await selectFilter(fixture, key, values)
      const trigger = await openFilter(fixture, key)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
      expect(selectedValues(key).sort()).toEqual([...values].sort())
      expect(visibleOffers(fixture)).toEqual([all[0].link, all[1].link])
      expect(shopRoot(fixture).querySelectorAll('.filter-chip')).toHaveLength(2)
      filterButtons(key)
        .find(
          (button) =>
            button.getAttribute('data-shop-filter-value') === values[0],
        )!
        .click()
      await fixture.whenStable()
      expect(visibleOffers(fixture)).toEqual([all[1].link])
      filterButtons(key)
        .find(
          (button) =>
            button.getAttribute('data-shop-filter-value') === values[1],
        )!
        .click()
      await fixture.whenStable()
      expect(visibleOffers(fixture)).toEqual(all.map((shop) => shop.link))
      expect(filterButtons(key)[0].getAttribute('aria-checked')).toBe('true')
      expect(getCardShops).toHaveBeenCalledTimes(1)
    },
  )

  it('combines multi-select filters with AND and removes only the chosen chip value', async () => {
    const all = [
      offer(1, { country: 'ES', locale: 'en' }),
      offer(2, { country: 'US', locale: 'en' }),
      offer(3, { country: 'US', locale: 'fr' }),
      offer(4, { locale: 'en' }),
    ]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'country', ['ES', 'US'])
    await selectFilter(fixture, 'locale', ['en'])
    expect(visibleOffers(fixture)).toEqual([all[0].link, all[1].link])
    shopRoot(fixture)
      .querySelector('.filter-chip__close[aria-label*="Spain"]')
      .click()
    await fixture.whenStable()
    expect(selectedValues('country')).toEqual(['US'])
    expect(selectedValues('locale')).toEqual(['en'])
    expect(visibleOffers(fixture)).toEqual([all[1].link])
    expect(
      shopRoot(fixture)
        .querySelector('[data-shop-filter-trigger="identity"] .badge')
        .textContent.trim(),
    ).toBe('1')
  })

  it('resolves printing filter labels from SetQuery while retaining raw values and unknown names', async () => {
    const all = [
      offer(1, { set: 'CE' }),
      offer(2, { set: 'CE:Special art' }),
      offer(3, { set: 'Jyhad' }),
      offer(4, { set: 'Unknown:Rare' }),
    ]
    const { fixture, sets, getSetByAbbrev } = await setup([all[0]], true, all)
    sets.set([
      {
        id: 1,
        abbrev: 'CE',
        fullName: 'Camarilla Edition',
        lastUpdate: new Date('2026-10-31'),
      },
      {
        id: 2,
        abbrev: 'Jyhad',
        fullName: 'Jyhad',
        lastUpdate: new Date('2026-10-31'),
      },
    ])
    await loadMore(fixture)
    expect(
      filterButtons('set').map((button) => button.textContent?.trim()),
    ).toEqual([
      'All',
      'Camarilla Edition',
      'Camarilla Edition: Special art',
      'Jyhad',
      'Unknown:Rare',
    ])
    expect(getSetByAbbrev).toHaveBeenCalledWith('CE')
    expect(getSetByAbbrev).toHaveBeenCalledWith('Unknown')
    await selectFilter(fixture, 'set', ['CE', 'Unknown:Rare'])
    expect(selectedValues('set').sort()).toEqual(['CE', 'Unknown:Rare'])
    expect(visibleOffers(fixture)).toEqual([all[0].link, all[3].link])
    expect(
      shopRoot(fixture).querySelector('.filter-chip').textContent,
    ).toContain('Camarilla Edition')
    expect(
      shopRoot(fixture).querySelector('.shop-printing').textContent.trim(),
    ).toBe('CE')
  })

  it('refreshes set names when the catalog becomes available without changing selections', async () => {
    const all = [offer(1, { set: 'CE' }), offer(2, { set: 'Unknown' })]
    const { fixture, sets, getCardShops } = await setup([all[0]], true, all)
    await loadMore(fixture)
    await selectFilter(fixture, 'set', 'CE')
    expect(
      shopRoot(fixture).querySelector('.filter-chip').textContent,
    ).toContain('CE')
    sets.set([
      {
        id: 1,
        abbrev: 'CE',
        fullName: 'Camarilla Edition',
        lastUpdate: new Date('2026-10-31'),
      },
    ])
    await fixture.whenStable()
    expect(
      filterButtons('set')
        .find(
          (button) => button.getAttribute('data-shop-filter-value') === 'CE',
        )
        ?.textContent?.trim(),
    ).toBe('Camarilla Edition')
    expect(
      shopRoot(fixture).querySelector('.filter-chip').textContent,
    ).toContain('Camarilla Edition')
    expect(selectedValues('set')).toEqual(['CE'])
    expect(visibleOffers(fixture)).toEqual([all[0].link])
    expect(getCardShops).toHaveBeenCalledTimes(1)
  })

  it('retains distinct printings and sellers that share the same destination link', async () => {
    const all = [
      offer(1, { seller: 'first', set: 'Jyhad' }),
      offer(1, { seller: 'second', set: 'VTES' }),
      offer(1, { seller: 'third', set: 'VTES' }),
    ]
    const { fixture } = await setup([all[0]], true, all)
    await loadMore(fixture)
    expect(visibleOffers(fixture)).toHaveLength(3)
    await selectFilter(fixture, 'set', 'VTES')
    expect(visibleOffers(fixture)).toHaveLength(2)
    expect(
      shopRoot(fixture).querySelector('.shop-offer').textContent,
    ).toContain('second')
    await selectFilter(fixture, 'seller', 'third')
    expect(visibleOffers(fixture)).toHaveLength(1)
    expect(
      shopRoot(fixture).querySelector('.shop-offer').textContent,
    ).toContain('third')
  })
})
