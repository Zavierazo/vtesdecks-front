import { Injectable, inject } from '@angular/core'
import { Meta, Title } from '@angular/platform-browser'
import { Router } from '@angular/router'

const BASE_URL = 'https://vtesdecks.com'
const DEFAULT_TITLE = 'VTES Decks'
const DEFAULT_DESCRIPTION =
  'Browse thousands of tournament-winning and community VTES decks, build your own, track your collection and explore the metagame.'
const DEFAULT_IMAGE = `${BASE_URL}/assets/icons/icon_x512.png`

export interface SeoConfig {
  title?: string
  description?: string
  image?: string
  /** Absolute URL – defaults to current route */
  canonicalUrl?: string
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title)
  private readonly meta = inject(Meta)
  private readonly router = inject(Router)

  update(config: SeoConfig = {}): void {
    const pageTitle = config.title
      ? `VTES Decks - ${config.title}`
      : DEFAULT_TITLE
    const description = config.description ?? DEFAULT_DESCRIPTION
    const image = config.image ?? DEFAULT_IMAGE
    const url = config.canonicalUrl ?? `${BASE_URL}${this.router.url}`

    this.title.setTitle(pageTitle)

    // Standard
    this.meta.updateTag({ name: 'description', content: description })

    // Canonical
    this.updateCanonical(url)

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: pageTitle })
    this.meta.updateTag({ property: 'og:description', content: description })
    this.meta.updateTag({ property: 'og:url', content: url })
    this.meta.updateTag({ property: 'og:image', content: image })

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle })
    this.meta.updateTag({ name: 'twitter:description', content: description })
    this.meta.updateTag({ name: 'twitter:image', content: image })
  }

  private updateCanonical(url: string): void {
    // Remove query params from canonical URL
    const cleanUrl = url.split('?')[0]
    let link: HTMLLinkElement | null = document.querySelector(
      "link[rel='canonical']",
    )
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', cleanUrl)
  }
}
