import { RouterStateSnapshot } from '@angular/router'
import { ApiDeck, ApiDeckArchetype, ApiPublicUser } from '@models'

export interface SeoConfig {
  page?: string
  params?: Record<string, string>
  title?: string
  description?: string
  /** null omits the canonical on unavailable pages. */
  canonicalUrl?: string | null
  index?: boolean
  language?: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  imageAlt?: string
  structuredData?: Record<string, unknown>[]
  schemaType?: 'WebPage' | 'CollectionPage'
}

export const SEO_BASE_URL = 'https://vtesdecks.com'

export function canonicalPath(url: string): string {
  return new URL(url, SEO_BASE_URL).pathname.replace(/\/+$/, '') || '/'
}

const PUBLIC_PAGES: Record<string, string> = {
  '/': 'home',
  '/decks': 'decks',
  '/cards/crypt': 'crypt',
  '/cards/library': 'library',
  '/metagame': 'metagame',
  '/statistics': 'statistics',
  '/vtesdle': 'vtesdle',
  '/advent': 'advent',
  '/proxy-generator': 'proxy',
  '/contact': 'contact',
  '/changelog': 'changelog',
  '/terms': 'terms',
  '/privacy-policy': 'privacy',
  '/tutorial': 'tutorial',
  '/tutorial/play': 'tutorial',
  '/tutorial/resources': 'resources',
}

const PRIVATE_PAGES: Record<string, string> = {
  '/user/settings': 'settings',
  '/admin': 'admin',
  '/verify': 'verify',
  '/reset-password': 'reset',
  '/decks/builder': 'builder',
  '/cards': 'builder',
  '/collection': 'collection',
  '/wishlist': 'wishlist',
}

export function unavailableSeo(): SeoConfig {
  return { page: 'notFound', index: false, canonicalUrl: null }
}

export function deckSeo(deck: ApiDeck): SeoConfig & { canonicalUrl: string } {
  return {
    page: 'deck',
    params: {
      name: deck.name,
      author: deck.author || deck.user?.displayName || deck.user?.user || '',
      details: deck.tournament || '',
    },
    index: deck.published === true,
    canonicalUrl: `/deck/${encodeURIComponent(deck.id)}`,
  }
}

export function routeSeo(state: RouterStateSnapshot): SeoConfig {
  let route = state.root
  const data = { ...route.data }
  while (route.firstChild) {
    route = route.firstChild
    Object.assign(data, route.data)
  }
  if (route.routeConfig?.path === '**') return unavailableSeo()
  let path = canonicalPath(state.url)
  path = path.replace(/^\/decks\/builder\/(crypt|library)$/, '/cards/$1')
  const base: SeoConfig = { canonicalUrl: path, index: false, page: 'account' }
  if (/^\/deck\/[^/]+\/embed$/.test(path)) {
    return {
      ...base,
      page: 'embed',
      params: { name: data['deck']?.name ?? '' },
    }
  }
  if (data['deck']) return deckSeo(data['deck'] as ApiDeck)
  if (data['archetype']) {
    const archetype = data['archetype'] as ApiDeckArchetype
    return {
      ...base,
      page: 'archetype',
      params: { name: archetype.name },
      index: archetype.enabled === true,
    }
  }
  if (data['user']) {
    const user = data['user'] as ApiPublicUser
    return {
      ...base,
      page: 'profile',
      params: { name: user.displayName || user.user, username: user.user },
      index: true,
    }
  }
  const page = PUBLIC_PAGES[path]
  if (page) {
    return {
      ...base,
      page,
      index: !(path === '/decks' && route.queryParamMap.get('type') === 'USER'),
      schemaType: ['decks', 'crypt', 'library', 'metagame'].includes(page)
        ? 'CollectionPage'
        : 'WebPage',
    }
  }
  const privatePath = Object.keys(PRIVATE_PAGES).find(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
  // Async public resources remain noindex until their API confirms visibility.
  return { ...base, page: privatePath ? PRIVATE_PAGES[privatePath] : 'loading' }
}
