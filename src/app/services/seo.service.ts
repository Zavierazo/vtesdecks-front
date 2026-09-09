import { DOCUMENT } from '@angular/common'
import { DestroyRef, Injectable, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Meta, Title } from '@angular/platform-browser'
import {
  NavigationCancel,
  NavigationError,
  NavigationStart,
  Router,
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import {
  canonicalPath,
  routeSeo,
  SEO_BASE_URL,
  SeoConfig,
} from './seo-route.config'

export type { SeoConfig } from './seo-route.config'
const DEFAULT_IMAGE = `${SEO_BASE_URL}/assets/img/og-image.png`
const LOCALES: Record<string, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  pt: 'pt_PT',
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT)
  private readonly title = inject(Title)
  private readonly meta = inject(Meta)
  private readonly transloco = inject(TranslocoService)
  private readonly destroyRef = inject(DestroyRef)
  private config?: SeoConfig
  private activePath = ''
  private navigating = false
  private pending = new Map<string, SeoConfig>()
  private override?: SeoConfig
  private started = false

  constructor() {
    // Wait for each language file before rendering translated metadata.
    this.transloco
      .selectTranslation()
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!this.navigating) this.render()
      })
  }

  start(router: Router): void {
    if (this.started) return
    this.started = true
    router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.navigating = true
          this.pending.clear()
          this.clear()
        } else if (
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          this.navigating = false
          this.pending.clear()
          this.render()
        }
      })
  }

  activate(state: RouterStateSnapshot): void {
    const path = canonicalPath(state.url)
    const samePage = path === this.activePath
    const override =
      this.pending.get(path) ?? (samePage ? this.override : undefined)
    this.config = routeSeo(state)
    if (
      override?.canonicalUrl &&
      canonicalPath(override.canonicalUrl) === path
    ) {
      this.config = { ...this.config, ...override }
    }
    this.activePath = path
    this.override = override
    this.navigating = false
    this.pending.clear()
    this.render()
  }

  /** Tie async metadata to its route so late responses cannot affect another page. */
  update(config: SeoConfig & { canonicalUrl: string }): void {
    if (this.navigating) {
      this.pending.set(canonicalPath(config.canonicalUrl), config)
    } else if (canonicalPath(config.canonicalUrl) === this.activePath) {
      this.config = { ...config }
      this.override = config
      this.render()
    }
  }

  private clear(): void {
    this.title.setTitle('VTES Decks')
    this.document
      .querySelectorAll("link[rel='canonical'], script[data-seo]")
      .forEach((node) => node.remove())
    for (const name of [
      'description',
      'robots',
      'twitter:title',
      'twitter:description',
      'twitter:image',
      'twitter:image:alt',
    ]) {
      this.meta.removeTag(`name='${name}'`)
    }
    for (const property of [
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'og:locale',
    ]) {
      this.meta.removeTag(`property='${property}'`)
    }
  }

  private render(): void {
    if (!this.config) return
    const config = this.config
    const requestedLanguage = config.language ?? this.transloco.getActiveLang()
    const language = LOCALES[requestedLanguage] ? requestedLanguage : 'en'
    const translate = (key: string) =>
      this.transloco.translate<string>(key, config.params, language)
    const page = config.page ?? 'home'
    const heading = config.title ?? translate(`seo.${page}.title`)
    const pageTitle = heading ? `VTES Decks - ${heading}` : 'VTES Decks'
    const description = (
      config.description ?? translate(`seo.${page}.description`)
    )
      .replace(/\s+/g, ' ')
      .trim()
    const url =
      config.canonicalUrl === null
        ? null
        : `${SEO_BASE_URL}${canonicalPath(config.canonicalUrl ?? this.activePath)}`
    const image = new URL(config.image ?? DEFAULT_IMAGE, SEO_BASE_URL).href
    const defaultImage = image === DEFAULT_IMAGE
    const imageAlt = config.imageAlt ?? heading

    this.clear()
    this.document.documentElement.lang = language
    this.title.setTitle(pageTitle)
    this.meta.updateTag({ name: 'description', content: description })
    this.meta.updateTag({
      name: 'robots',
      content: config.index === true ? 'index, follow' : 'noindex, follow',
    })
    if (url) {
      const canonical = this.document.createElement('link')
      canonical.rel = 'canonical'
      canonical.href = url
      this.document.head.appendChild(canonical)
      this.meta.updateTag({ property: 'og:url', content: url })
    }
    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:site_name': 'VTES Decks',
      'og:title': pageTitle,
      'og:description': description,
      'og:image': image,
      'og:image:alt': imageAlt,
      'og:locale': LOCALES[language],
    }))
      this.meta.updateTag({ property, content })
    const width = config.imageWidth ?? (defaultImage ? 1200 : undefined)
    const height = config.imageHeight ?? (defaultImage ? 630 : undefined)
    if (width)
      this.meta.updateTag({
        property: 'og:image:width',
        content: String(width),
      })
    if (height)
      this.meta.updateTag({
        property: 'og:image:height',
        content: String(height),
      })
    for (const [name, content] of Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': pageTitle,
      'twitter:description': description,
      'twitter:image': image,
      'twitter:image:alt': imageAlt,
    }))
      this.meta.updateTag({ name, content })

    if (config.index !== true || !url) return
    const graph: Record<string, unknown>[] = [
      {
        '@type': config.schemaType ?? 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: pageTitle,
        description,
        inLanguage: language,
        isPartOf: { '@id': `${SEO_BASE_URL}/#website` },
      },
    ]
    if (page === 'home')
      graph.push({
        '@type': 'WebSite',
        '@id': `${SEO_BASE_URL}/#website`,
        name: 'VTES Decks',
        url: `${SEO_BASE_URL}/`,
        inLanguage: language,
      })
    graph.push(...(config.structuredData ?? []))
    const script = this.document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset['seo'] = ''
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    }).replace(/</g, '\\u003c')
    this.document.head.appendChild(script)
  }
}

/** Apply metadata after activation, replacing Angular's static route-title writer. */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService)
  override updateTitle(state: RouterStateSnapshot): void {
    this.seo.activate(state)
  }
}
