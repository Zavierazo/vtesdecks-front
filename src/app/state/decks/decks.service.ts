import { Injectable, inject } from '@angular/core'
import { Params } from '@angular/router'
import { ApiDecks } from '@models'
import { ApiDataService } from '@services'
import { EMPTY, Observable, finalize, tap } from 'rxjs'
import { DecksState, DecksStore } from './decks.store'
@Injectable({
  providedIn: 'root',
})
export class DecksService {
  private readonly decksStore = inject(DecksStore)
  private readonly apiDataService = inject(ApiDataService)

  private revision = 0

  static readonly initLimit = 20
  static readonly limit = 10

  reset(): void {
    this.revision++
    this.decksStore.reset()
  }

  init(params: Params): boolean {
    const currentParams = this.decksStore.getValue().params
    if (
      !this.decksStore.isEmpty() &&
      Object.keys(currentParams).length === Object.keys(params).length &&
      JSON.stringify(currentParams) === JSON.stringify(params)
    ) {
      // No need to re-initialize if params are the same and store is not empty
      return false
    }
    this.decksStore.reset()
    this.decksStore.updatePage(true, 0)
    this.decksStore.updateParams(params)
    return true
  }

  refreshLoaded(): Observable<ApiDecks> {
    const revision = ++this.revision
    const state = this.decksStore.getValue()
    const limit = Math.max(
      DecksService.initLimit,
      this.decksStore.getEntities().length,
    )
    return this.apiDataService.getDecks(0, limit, state.params).pipe(
      tap((response) => {
        if (
          this.decksStore.getValue().params !== state.params ||
          revision !== this.revision
        ) {
          return
        }
        this.decksStore.replaceDecks(response.decks)
        this.decksStore.updateTotal(response.total)
        this.decksStore.updatePage(
          response.total > response.decks.length,
          response.decks.length,
        )
        this.decksStore.updateRestorableDecks(response.restorableDecks ?? [])
        this.decksStore.setLoading(false)
      }),
      finalize(() => {
        if (
          this.decksStore.getValue().params === state.params &&
          revision === this.revision
        ) {
          this.decksStore.setLoading(false)
        }
      }),
    )
  }

  getMore(overrideLimit?: number): Observable<ApiDecks> {
    const revision = this.revision
    const deckState: DecksState = this.decksStore.getValue()
    if (deckState.hasMore && !this.decksStore.getLoading()) {
      this.decksStore.setLoading(true)
      const limit =
        overrideLimit ??
        (deckState.offset === 0 ? DecksService.initLimit : DecksService.limit)
      return this.apiDataService
        .getDecks(deckState.offset, limit, deckState.params)
        .pipe(
          tap((decks) => {
            if (
              this.decksStore.getValue().params === deckState.params &&
              revision === this.revision
            ) {
              this.updateDecks(decks, limit)
            }
          }),
          finalize(() => {
            if (
              this.decksStore.getValue().params === deckState.params &&
              revision === this.revision
            ) {
              this.decksStore.setLoading(false)
            }
          }),
        )
    }
    return EMPTY
  }

  clearLastViewedDeck(): void {
    this.decksStore.setLastViewedDeckId(null)
  }

  setLastViewedDeckId(deckId: string): void {
    this.decksStore.setLastViewedDeckId(deckId)
  }

  markVisited(deckId: string): void {
    this.decksStore.markVisited(deckId)
  }

  private updateDecks(response: ApiDecks, limit: number) {
    const nextOffset = response.offset + limit
    this.decksStore.add(response.decks)
    this.decksStore.updateTotal(response.total)
    this.decksStore.updateCurrency(response.currency ?? 'EUR')
    this.decksStore.updatePage(response.total > nextOffset, nextOffset)
    if (response.offset === 0) {
      this.decksStore.updateRestorableDecks(response.restorableDecks)
    }
    this.decksStore.setLoading(false)
  }
}
