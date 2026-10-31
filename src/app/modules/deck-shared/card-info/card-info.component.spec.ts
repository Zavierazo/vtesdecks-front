import { NO_ERRORS_SCHEMA, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { ApiCardInfo, ApiLibrary, ApiShop } from '@models'
import { ApiDataService, MediaService } from '@services'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../../services/connectivity.service'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'
import { WishlistCardStatsComponent } from '../wishlist-card-stats/wishlist-card-stats.component'
import { CardInfoComponent } from './card-info.component'

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

  async function setup(shops: ApiShop[], hasMoreShops = false, all = shops) {
    const getCardShops = vi.fn(() => of(all))
    const translations = {
      deck_shared: {
        sets: 'Sets',
        rulings: 'Rulings',
        no_rulings: 'No rulings',
        where_find: 'Where to buy',
        show_more: 'Show more',
        ebay_affiliate_disclosure: 'Affiliate links',
      },
    }
    TestBed.configureTestingModule({
      imports: [
        CardInfoComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: translations, es: translations },
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
        { provide: ConnectivityService, useValue: { offline: signal(false) } },
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
    } as unknown as ApiCardInfo)
    fixture.componentInstance.shopsCollapsed = false
    await fixture.whenStable()
    return { fixture, getCardShops }
  }

  it('places the flag inside the badge and localizes the accessible country name', async () => {
    const longSeller = 'a-long-seller-name-'.repeat(8)
    const offers = [
      offer(1, { seller: longSeller, country: 'ES', continent: 'EU' }),
      offer(2, { seller: 'another-seller', country: 'US', continent: 'NA' }),
    ]
    const { fixture } = await setup([offers[0]], true, offers)
    fixture.nativeElement.querySelector('button').click()
    await fixture.whenStable()

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.shop-offer'),
    )
    expect(links).toHaveLength(2)
    expect(links[0].textContent).toContain(longSeller)
    expect(links[1].textContent).toContain('another-seller')
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
    const { fixture } = await setup([offer(1, { country: 'mx' })])
    const country: HTMLElement =
      fixture.nativeElement.querySelector('.shop-country')
    const image = country.querySelector('img')!
    expect(image.getAttribute('src')).toBe('https://flagcdn.com/w40/mx.png')

    image.dispatchEvent(new Event('error'))
    await fixture.whenStable()

    expect(country.querySelector('img')).toBeNull()
    expect(country.textContent?.trim()).toBe('MX')
    expect(country.getAttribute('aria-label')).toBe('Mexico')
  })

  it('shows an invalid country code without requesting a flag image', async () => {
    const { fixture } = await setup([offer(1, { country: 'abc' })])
    const country: HTMLElement =
      fixture.nativeElement.querySelector('.shop-country')

    expect(country.querySelector('img')).toBeNull()
    expect(country.textContent?.trim()).toBe('ABC')
  })

  it('supports responses without the new optional metadata', async () => {
    const { fixture } = await setup([offer(1)])
    const link: HTMLAnchorElement =
      fixture.nativeElement.querySelector('.shop-offer')

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
        fixture.nativeElement.querySelector('.shop-offer-label').textContent,
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
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button')

    expect(fixture.nativeElement.querySelectorAll('.shop-offer')).toHaveLength(
      1,
    )
    expect(fixture.nativeElement.textContent).toContain('first')
    expect(fixture.nativeElement.textContent).not.toContain('second')
    button.click()
    await fixture.whenStable()

    expect(getCardShops).toHaveBeenCalledExactlyOnceWith(100545, true)
    expect(fixture.nativeElement.querySelectorAll('.shop-offer')).toHaveLength(
      3,
    )
    expect(fixture.nativeElement.textContent).toContain('first')
    expect(fixture.nativeElement.textContent).toContain('second')
    const extra: HTMLAnchorElement =
      fixture.nativeElement.querySelectorAll('.shop-offer')[2]
    expect(extra.querySelector('.shop-offer-label')?.textContent).toContain(
      'TCG Market',
    )
    expect(extra.querySelector('.shop-offer-label')?.textContent).toContain(
      'tcgmarket',
    )
    expect(
      extra.querySelector('.shop-country')?.getAttribute('aria-label'),
    ).toBe('Spain')
    expect(extra.querySelector('.shop-country img')).not.toBeNull()
    expect(fixture.nativeElement.querySelector('button')).toBeNull()
  })
})
