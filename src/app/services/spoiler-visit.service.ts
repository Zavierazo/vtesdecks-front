import { Injectable, computed, inject, signal } from '@angular/core'
import { LocalStorageService } from './local-storage.service'

interface SpoilerCatalog {
  /** Update date of the newest spoiler card this browser knows about. */
  latest?: string
  /** Cards updated after this date are highlighted as newly revealed. */
  newSince?: string
}

@Injectable({
  providedIn: 'root',
})
export class SpoilerVisitService {
  private static readonly CATALOG_KEY = 'spoiler_catalog'
  private static readonly DECK_VISITS_KEY = 'spoiler_deck_visits'
  private readonly localStorage = inject(LocalStorageService)
  private readonly catalogSeen = signal(0)

  private readonly newSince = computed(() => {
    this.catalogSeen()
    return this.getCatalog().newSince
  })

  /** True when the deck changed since this browser last opened it. */
  hasNewSpoilers(
    deckId: string,
    lastUpdate: Date | string | null | undefined,
  ): boolean {
    const updateTimestamp = this.parseTimestamp(lastUpdate)
    if (updateTimestamp === null) {
      return false
    }

    const visitTimestamp = this.parseTimestamp(this.getDeckVisits()[deckId])
    return visitTimestamp === null || updateTimestamp > visitTimestamp
  }

  /** Records when this browser opened the deck. */
  markDeckVisited(
    deckId: string,
    visitedAt: Date | string | null | undefined,
  ): void {
    const visitTimestamp = this.parseTimestamp(visitedAt)
    if (visitTimestamp === null) {
      return
    }

    const visits = this.getDeckVisits()
    const storedTimestamp = this.parseTimestamp(visits[deckId])
    if (storedTimestamp !== null && visitTimestamp <= storedTimestamp) {
      return
    }

    visits[deckId] = new Date(visitTimestamp).toISOString()
    this.localStorage.setValue(SpoilerVisitService.DECK_VISITS_KEY, visits)
  }

  /**
   * Records the newest known spoiler card. Whenever a newer one shows up, the
   * previous newest becomes the baseline, so the cards revealed in that batch
   * stay highlighted everywhere until the next reveal.
   */
  markSpoilersSeen(latest: Date | string | null | undefined): void {
    const latestTimestamp = this.parseTimestamp(latest)
    if (latestTimestamp === null) {
      return
    }

    const catalog = this.getCatalog()
    const storedTimestamp = this.parseTimestamp(catalog.latest)
    if (storedTimestamp !== null && latestTimestamp <= storedTimestamp) {
      return
    }

    this.localStorage.setValue(SpoilerVisitService.CATALOG_KEY, {
      latest: new Date(latestTimestamp).toISOString(),
      // On the very first load nothing is highlighted: the whole catalog is
      // already known by the time the browser stores it.
      newSince: catalog.latest ?? new Date(latestTimestamp).toISOString(),
    })
    this.catalogSeen.update((value) => value + 1)
  }

  /** True when the card was revealed after the last known batch of spoilers. */
  isNewCard(lastUpdate: Date | string | null | undefined): boolean {
    const baselineTimestamp = this.parseTimestamp(this.newSince())
    const updateTimestamp = this.parseTimestamp(lastUpdate)
    if (baselineTimestamp === null || updateTimestamp === null) {
      // Without a baseline every card would look new, so highlight nothing
      // until we know what this browser had already seen.
      return false
    }
    return updateTimestamp > baselineTimestamp
  }

  private getCatalog(): SpoilerCatalog {
    const value = this.localStorage.getValue<unknown>(
      SpoilerVisitService.CATALOG_KEY,
    )
    if (!value || typeof value !== 'object') {
      return {}
    }

    const catalog = value as Record<string, unknown>
    return {
      latest: this.validDateString(catalog['latest']),
      newSince: this.validDateString(catalog['newSince']),
    }
  }

  private getDeckVisits(): Record<string, string> {
    const value = this.localStorage.getValue<unknown>(
      SpoilerVisitService.DECK_VISITS_KEY,
    )
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    const visits: Record<string, string> = {}
    for (const [deckId, visitedAt] of Object.entries(value)) {
      const visit = this.validDateString(visitedAt)
      if (deckId && visit) {
        visits[deckId] = visit
      }
    }
    return visits
  }

  private validDateString(value: unknown): string | undefined {
    return typeof value === 'string' && this.parseTimestamp(value) !== null
      ? value
      : undefined
  }

  private parseTimestamp(
    value: Date | string | null | undefined,
  ): number | null {
    if (!value) {
      return null
    }
    const timestamp =
      value instanceof Date ? value.getTime() : Date.parse(value)
    return Number.isNaN(timestamp) ? null : timestamp
  }
}
