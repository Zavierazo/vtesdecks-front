import { Injectable, inject } from '@angular/core'
import { Observable, tap } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from './../../services/api.data.service'
import { DeckStore } from './deck.store'
@Injectable({
  providedIn: 'root',
})
export class DeckService {
  private readonly deckStore = inject(DeckStore);
  private readonly apiDataService = inject(ApiDataService);

  static readonly limit = 10

  getDeck(id: string): Observable<ApiDeck> {
    this.deckStore.reset()
    this.deckStore.setLoading(true)
    return this.apiDataService
      .getDeck(id)
      .pipe(tap((deck) => this.updateDeck(deck)))
  }

  private updateDeck(deck: ApiDeck) {
    this.deckStore.update((state) => ({ ...state, deck }))
    this.deckStore.setLoading(false)
  }
}
