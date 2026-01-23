import { Injectable, inject } from '@angular/core'
import { Params } from '@angular/router'
import { ApiDecks } from '@models'
import { ApiDataService } from '@services'
import { EMPTY, Observable, tap } from 'rxjs'
import { DecksState, DecksStore } from './decks.store'
@Injectable({
  providedIn: 'root',
})
export class DecksService {
  private readonly decksStore = inject(DecksStore)
  private readonly apiDataService = inject(ApiDataService)

  static readonly initLimit = 20
  static readonly limit = 10

  reset(): void {
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

  getMore(overrideLimit?: number): Observable<ApiDecks> {
    const deckState: DecksState = this.decksStore.getValue()
    if (deckState.hasMore) {
      this.decksStore.setLoading(true)
      const limit =
        overrideLimit ??
        (deckState.offset === 0 ? DecksService.initLimit : DecksService.limit)
      return this.apiDataService
        .getDecks(deckState.offset, limit, deckState.params)
        .pipe(tap((decks) => this.updateDecks(decks, limit)))
    }
    return EMPTY
  }

  clearLastViewedDeck(): void {
    this.decksStore.setLastViewedDeckId(null)
  }

  setLastViewedDeckId(deckId: string): void {
    this.decksStore.setLastViewedDeckId(deckId)
  }

  private updateDecks(response: ApiDecks, limit: number) {
    const nextOffset = response.offset + limit
    this.decksStore.add(response.decks)
    this.decksStore.updateTotal(response.total)
    this.decksStore.updatePage(response.total > nextOffset, nextOffset)
    if (response.offset === 0) {
      this.decksStore.updateRestorableDecks(response.restorableDecks)
    }
    this.decksStore.setLoading(false)
  }
}
