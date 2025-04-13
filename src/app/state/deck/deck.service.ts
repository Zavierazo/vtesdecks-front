import { Injectable } from '@angular/core'
import { Observable, tap } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from './../../services/api.data.service'
import { DeckStore } from './deck.store'
@Injectable({
  providedIn: 'root',
})
export class DeckService {
  static readonly limit = 10

  constructor(
    private deckStore: DeckStore,
    private apiDataService: ApiDataService,
  ) {}

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
