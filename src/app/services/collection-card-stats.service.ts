import { inject, Injectable } from '@angular/core'
import { ApiCollectionCardStats } from '@models'
import {
  catchError,
  EMPTY,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  timer,
} from 'rxjs'
import { ApiDataService } from './api.data.service'

const EMPTY_STATS: ApiCollectionCardStats = {
  collectionNumber: 0,
  decksNumber: 0,
  trackedDecksNumber: 0,
}

/**
 * Batches collection card stats lookups: requests arriving in the same
 * debounce window (e.g. every card of a deck rendered in grid view) are
 * collapsed into a single bulk API call, and results are cached until a
 * collection mutation invalidates them.
 */
@Injectable({
  providedIn: 'root',
})
export class CollectionCardStatsService {
  private static readonly FLUSH_DELAY_MS = 50

  private readonly apiDataService = inject(ApiDataService)

  private readonly cache = new Map<number, ApiCollectionCardStats>()
  private readonly pendingIds = new Set<number>()
  private pendingBatch$?: Observable<ApiCollectionCardStats[]>

  getStats(cardId: number): Observable<ApiCollectionCardStats> {
    const cached = this.cache.get(cardId)
    if (cached) {
      return of(cached)
    }
    this.pendingIds.add(cardId)
    return this.fetchPendingBatch().pipe(
      map(() => this.cache.get(cardId) ?? EMPTY_STATS),
    )
  }

  invalidate(): void {
    this.cache.clear()
  }

  private fetchPendingBatch(): Observable<ApiCollectionCardStats[]> {
    this.pendingBatch$ ??= timer(
      CollectionCardStatsService.FLUSH_DELAY_MS,
    ).pipe(
      switchMap(() => {
        const ids = Array.from(this.pendingIds)
        this.pendingIds.clear()
        this.pendingBatch$ = undefined
        return this.apiDataService.getCardCollectionStatsBulk(ids, true).pipe(
          tap((stats) => {
            stats.forEach((stat) => this.cache.set(stat.cardId!, stat))
            ids
              .filter((id) => !this.cache.has(id))
              .forEach((id) => this.cache.set(id, EMPTY_STATS))
          }),
        )
      }),
      catchError(() => EMPTY),
      shareReplay(1),
    )
    return this.pendingBatch$
  }
}
