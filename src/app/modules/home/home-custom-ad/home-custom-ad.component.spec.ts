import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ApiFeatureFlag } from '@models'
import { AuthQuery } from '@state/auth/auth.query'
import { FeatureFlagStore } from '@state/feature-flag/feature-flag.store'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { BehaviorSubject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdSenseDirective } from '../../../shared/directives/ad-sense.directive'
import { HomeCustomAdComponent } from './home-custom-ad.component'

function flags(countries: string[] = []): ApiFeatureFlag[] {
  return [
    { key: 'home_ad', type: 'BOOLEAN', value: true },
    { key: 'home_ad_url', type: 'STRING', value: 'https://example.com' },
    { key: 'home_ad_image', type: 'STRING', value: '/sponsor.png' },
    { key: 'home_ad_countries', type: 'LIST', value: countries },
  ]
}

describe('Home custom ad selection', () => {
  afterEach(() => {
    TestBed.resetTestingModule()
    vi.restoreAllMocks()
  })

  async function setup() {
    const supporter = new BehaviorSubject(false)
    const country = new BehaviorSubject<string | undefined>(undefined)
    const countryLoaded = new BehaviorSubject(false)
    const initialize = vi
      .spyOn(AdSenseDirective.prototype, 'ngAfterViewInit')
      .mockImplementation(() => undefined)
    TestBed.configureTestingModule({
      imports: [
        HomeCustomAdComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        {
          provide: AuthQuery,
          useValue: {
            selectSupporter: () => supporter,
            selectCountryCode: () => country,
            selectCountryLoaded: () => countryLoaded,
            isSupporter: () => supporter.value,
          },
        },
        { provide: GoogleAnalyticsService, useValue: { event: vi.fn() } },
      ],
    })
    const fixture = TestBed.createComponent(HomeCustomAdComponent)
    fixture.componentRef.setInput('adSlot', 'main')
    await fixture.whenStable()
    const store = TestBed.inject(FeatureFlagStore)
    const slot = () => fixture.nativeElement.querySelector('ins.adsbygoogle')
    const custom = () =>
      fixture.nativeElement.querySelector('[data-cy="home-custom-ad"]')
    return {
      fixture,
      store,
      supporter,
      country,
      countryLoaded,
      initialize,
      slot,
      custom,
    }
  }

  it('never creates or initializes the fallback while flags load before an eligible custom ad', async () => {
    const { fixture, store, initialize, slot, custom } = await setup()
    expect(slot()).toBeNull()
    expect(initialize).not.toHaveBeenCalled()
    store.setFlags(flags())
    await fixture.whenStable()
    expect(custom()).not.toBeNull()
    expect(slot()).toBeNull()
    expect(initialize).not.toHaveBeenCalled()
  })

  it('waits for country completion and keeps the replaced slot uninitialized', async () => {
    const { fixture, store, country, countryLoaded, initialize, slot, custom } =
      await setup()
    store.setFlags(flags(['ES']))
    await fixture.whenStable()
    expect(slot()).toBeNull()
    country.next('ES')
    await fixture.whenStable()
    expect(slot()).toBeNull()
    countryLoaded.next(true)
    await fixture.whenStable()
    expect(custom()).not.toBeNull()
    expect(initialize).not.toHaveBeenCalled()
  })

  it.each(['US', undefined])(
    'initializes the fallback once for a completed country lookup: %s',
    async (value) => {
      const { fixture, store, country, countryLoaded, initialize, slot } =
        await setup()
      store.setFlags(flags(['ES']))
      country.next(value)
      countryLoaded.next(true)
      await fixture.whenStable()
      expect(slot()).not.toBeNull()
      expect(initialize).toHaveBeenCalledTimes(1)
      store.setFlags(flags(['ES']))
      country.next(value)
      await fixture.whenStable()
      expect(initialize).toHaveBeenCalledTimes(1)
    },
  )

  it.each(['disabled', 'incomplete', 'failed'])(
    'uses the fallback without waiting for country when flags are %s',
    async (mode) => {
      const { fixture, store, initialize, slot } = await setup()
      const data = mode === 'failed' ? [] : flags(['ES'])
      if (mode === 'disabled') {
        data[0].value = false
      }
      if (mode === 'incomplete') {
        data.splice(2, 1)
      }
      store.setFlags(data)
      await fixture.whenStable()
      expect(slot()).not.toBeNull()
      expect(initialize).toHaveBeenCalledTimes(1)
    },
  )

  it('hides both ad types for supporters and reacts to later changes', async () => {
    const { fixture, store, supporter, initialize, custom, slot } =
      await setup()
    supporter.next(true)
    store.setFlags(flags())
    await fixture.whenStable()
    expect(slot()).toBeNull()
    expect(custom()).toBeNull()
    expect(initialize).not.toHaveBeenCalled()
    supporter.next(false)
    await fixture.whenStable()
    expect(custom()).not.toBeNull()
    store.setFlag({ key: 'home_ad', type: 'BOOLEAN', value: false })
    await fixture.whenStable()
    expect(slot()).not.toBeNull()
    expect(initialize).toHaveBeenCalledTimes(1)
    supporter.next(true)
    await fixture.whenStable()
    expect(slot()).toBeNull()
  })
})
