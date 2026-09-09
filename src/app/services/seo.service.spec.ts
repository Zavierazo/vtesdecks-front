import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  TitleStrategy,
  provideRouter,
} from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { Subject, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { redirectNotFound } from '../utils/not-found.utils'
import { SeoService, SeoTitleStrategy } from './seo.service'

@Component({ template: '' })
class TestPage {}

function translations(language: string) {
  const seo = Object.fromEntries(
    [
      'home',
      'decks',
      'deck',
      'archetype',
      'profile',
      'embed',
      'loading',
      'notFound',
      'collection',
      'publicWishlist',
      'binder',
      'settings',
    ].map((page) => [
      page,
      {
        title: `${language} ${page} {{name}}`,
        description: `${language} ${page} description {{name}} {{author}}`,
      },
    ]),
  )
  return { seo }
}

describe('SEO navigation lifecycle', () => {
  let seo: SeoService
  let router: Router
  let harness: RouterTestingHarness
  let resolveSlow: Subject<unknown>
  const canonical = () =>
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(
      `meta[name="${name}"], meta[property="${name}"]`,
    )?.content
  const graph = () =>
    JSON.parse(document.querySelector('script[data-seo]')!.textContent!)[
      '@graph'
    ] as Record<string, unknown>[]

  beforeEach(async () => {
    resolveSlow = new Subject()
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: Object.fromEntries(
            ['en', 'es', 'fr', 'pt'].map((language) => [
              language,
              translations(language),
            ]),
          ),
          translocoConfig: {
            availableLangs: ['en', 'es', 'fr', 'pt'],
            defaultLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([
          { path: '', component: TestPage },
          { path: 'decks', component: TestPage },
          {
            path: 'deck/:id/embed',
            component: TestPage,
            resolve: { deck: () => ({ name: 'Embedded' }) },
          },
          {
            path: 'deck/:id',
            component: TestPage,
            title: 'Static title must not win',
            resolve: {
              deck: (
                route: ActivatedRouteSnapshot,
                state: RouterStateSnapshot,
              ) =>
                route.params['id'] === 'missing'
                  ? redirectNotFound(
                      throwError(() => ({ status: 404 })),
                      router,
                      state.url,
                    )
                  : {
                      id: route.params['id'],
                      name: 'My deck',
                      author: 'Alice',
                      published: route.params['id'] !== 'private',
                      type: 'USER',
                    },
            },
          },
          {
            path: 'metagame/:id',
            component: TestPage,
            resolve: { archetype: () => ({ name: 'Bleed', enabled: true }) },
          },
          { path: 'user/settings', component: TestPage },
          {
            path: 'user/:username',
            component: TestPage,
            resolve: { user: () => ({ user: 'alice', displayName: 'Alice' }) },
          },
          { path: 'collections/users/:username/wishlist', component: TestPage },
          { path: 'collection/binders/:binderId', component: TestPage },
          {
            path: 'slow',
            component: TestPage,
            resolve: { wait: () => resolveSlow },
          },
          {
            path: 'cancelled',
            component: TestPage,
            canActivate: [() => false],
          },
          {
            path: 'failure',
            component: TestPage,
            resolve: { data: () => throwError(() => ({ status: 500 })) },
          },
          { path: '**', component: TestPage },
        ]),
        { provide: TitleStrategy, useClass: SeoTitleStrategy },
      ],
    })
    router = TestBed.inject(Router)
    seo = TestBed.inject(SeoService)
    seo.start(router)
    harness = await RouterTestingHarness.create()
  })

  afterEach(() => {
    TestBed.resetTestingModule()
    document
      .querySelectorAll('link[rel="canonical"],script[data-seo],meta')
      .forEach((node) => node.remove())
  })

  it('uses resolved deck metadata on a direct load and clears it when navigating away', async () => {
    await harness.navigateByUrl('/deck/123?utm_source=test#cards')
    expect(document.title).toContain('My deck')
    expect(document.title).not.toContain('Static title')
    expect(meta('description')).toContain('Alice')
    expect(canonical()).toBe('https://vtesdecks.com/deck/123')
    expect(meta('og:url')).toBe(canonical())
    expect(graph().some((item) => item['@type'] === 'BreadcrumbList')).toBe(
      false,
    )
    await harness.navigateByUrl('/decks?clans=Ventrue')
    expect(canonical()).toBe('https://vtesdecks.com/decks')
    expect(document.title).not.toContain('My deck')
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(graph().some((item) => item['@type'] === 'BreadcrumbList')).toBe(
      false,
    )
  })

  it('removes noindex after leaving embeds and missing pages', async () => {
    for (const url of [
      '/deck/123/embed',
      '/does-not-exist',
      '/deck/missing',
      '/deck/private',
      '/user/settings',
      '/decks?type=USER',
    ]) {
      await harness.navigateByUrl(url)
      expect(meta('robots'), url).toBe('noindex, follow')
      expect(document.querySelector('script[data-seo]')).toBeNull()
      await harness.navigateByUrl('/')
      expect(meta('robots')).toBe('index, follow')
      expect(graph().some((item) => item['@type'] === 'WebSite')).toBe(true)
    }
  })

  it('uses public profile and archetype data instead of previous metadata', async () => {
    await harness.navigateByUrl('/user/alice')
    expect(document.title).toContain('Alice')
    expect(meta('robots')).toBe('index, follow')
    await harness.navigateByUrl('/metagame/1')
    expect(document.title).toContain('Bleed')
    expect(meta('description')).not.toContain('Alice')
  })

  it('updates all language metadata without changing the URL', async () => {
    await harness.navigateByUrl('/deck/123')
    const transloco = TestBed.inject(TranslocoService)
    for (const [language, locale] of [
      ['en', 'en_US'],
      ['es', 'es_ES'],
      ['fr', 'fr_FR'],
      ['pt', 'pt_PT'],
    ]) {
      transloco.setActiveLang(language)
      expect(document.documentElement.lang).toBe(language)
      expect(meta('og:locale')).toBe(locale)
      expect(document.title).toContain(`${language} deck My deck`)
      expect(canonical()).toBe('https://vtesdecks.com/deck/123')
      expect(document.querySelector('link[hreflang]')).toBeNull()
    }
  })

  it('requires confirmation of async public resources and handles visibility changes', async () => {
    for (const path of [
      '/collections/users/alice/wishlist',
      '/collection/binders/public-hash',
    ]) {
      await harness.navigateByUrl(path)
      expect(meta('robots')).toBe('noindex, follow')
      seo.update({
        page: 'binder',
        params: { name: 'Shared cards' },
        canonicalUrl: path,
        index: true,
        schemaType: 'CollectionPage',
      })
      expect(meta('robots')).toBe('index, follow')
      expect(graph()[0]['@type']).toBe('CollectionPage')
      seo.update({ page: 'notFound', canonicalUrl: path, index: false })
      expect(meta('robots')).toBe('noindex, follow')
      expect(document.title).not.toContain('Shared cards')
    }
  })

  it('ignores late entity responses and restores metadata after cancellation or API failure', async () => {
    await harness.navigateByUrl('/deck/123')
    await router.navigateByUrl('/cancelled')
    expect(document.title).toContain('My deck')
    await expect(router.navigateByUrl('/failure')).rejects.toEqual({
      status: 500,
    })
    expect(document.title).toContain('My deck')
    expect(meta('robots')).toBe('index, follow')
    await harness.navigateByUrl('/decks')
    seo.update({
      title: 'Late response',
      canonicalUrl: '/deck/123',
      index: true,
    })
    expect(document.title).not.toContain('Late response')
    const navigation = router.navigateByUrl('/slow')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    resolveSlow.next(true)
    resolveSlow.complete()
    await navigation
    expect(canonical()).toBe('https://vtesdecks.com/slow')
  })

  it('normalizes canonical origins, removes stale image dimensions, and escapes JSON-LD', async () => {
    await harness.navigateByUrl('/decks')
    expect(meta('og:image:width')).toBe('1200')
    seo.update({
      canonicalUrl: 'http://other.example/decks?tracking=1#top',
      index: true,
      title: '</script><script>alert(1)</script>',
      image: '/custom.png',
    })
    expect(canonical()).toBe('https://vtesdecks.com/decks')
    expect(meta('og:url')).toBe(canonical())
    expect(meta('og:image:width')).toBeUndefined()
    expect(meta('og:image:height')).toBeUndefined()
    expect(
      document.querySelector('script[data-seo]')?.textContent,
    ).not.toContain('</script>')
    expect(graph()[0]['name']).toContain('</script>')
    await harness.navigateByUrl('/')
    expect(meta('og:image')).toBe(
      'https://vtesdecks.com/assets/img/og-image.png',
    )
    expect(meta('og:image:width')).toBe('1200')
  })
})
