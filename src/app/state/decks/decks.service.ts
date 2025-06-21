import { Injectable, inject } from '@angular/core'
import { Params } from '@angular/router'
import { EMPTY, Observable, tap } from 'rxjs'
import { ApiDecks } from './../../models/api-decks'
import { ApiDataService } from './../../services/api.data.service'
import { DecksState, DecksStore } from './decks.store'
@Injectable({
  providedIn: 'root',
})
export class DecksService {
  private readonly decksStore = inject(DecksStore)
  private readonly apiDataService = inject(ApiDataService)

  static readonly initLimit = 20
  static readonly limit = 10

  init(params: Params) {
    this.decksStore.remove()
    this.decksStore.updatePage(true, 0)
    this.decksStore.updateParams(params)
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
