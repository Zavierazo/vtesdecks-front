import { Injectable, inject } from '@angular/core'
import { ApiDeck, ApiDecks } from '@models'
import { ApiDataService } from '@services'
import { Observable, tap } from 'rxjs'
import { DeckStore } from './deck.store'
@Injectable({
  providedIn: 'root',
})
export class DeckService {
  private readonly deckStore = inject(DeckStore)
  private readonly apiDataService = inject(ApiDataService)

  static readonly limit = 10

  getDeck(id: string, collectionTracker?: boolean): Observable<ApiDeck> {
    this.deckStore.reset()
    this.deckStore.setLoading(true)
    return this.apiDataService
      .getDeck(id, collectionTracker)
      .pipe(tap((deck) => this.updateDeck(deck)))
  }

  getSimilarDecks(limit: number): Observable<ApiDecks> {
    return this.apiDataService.getDecks(0, limit, {
      bySimilarity: this.deckStore.getValue().deck!.id,
    })
  }

  toggleCollectionTracker(collectionTracker: boolean): Observable<boolean> {
    return this.apiDataService.updateCollectionTracker(
      this.deckStore.getValue().deck!.id,
      collectionTracker,
    )
  }

  private updateDeck(deck: ApiDeck) {
    this.deckStore.update((state) => ({ ...state, deck }))
    this.deckStore.setLoading(false)
  }
}
