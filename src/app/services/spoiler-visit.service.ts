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
  private readonly localStorage = inject(LocalStorageService)
  private readonly catalogSeen = signal(0)

  private readonly newSince = computed(() => {
    this.catalogSeen()
    return this.getCatalog().newSince
  })

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
