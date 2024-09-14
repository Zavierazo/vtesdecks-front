import { Observable, tap } from 'rxjs'
import { ApiDataService } from './../../services/api.data.service'
import { DeckStore } from './deck.store'
import { Injectable } from '@angular/core'
import { transaction } from '@datorama/akita'
import { ApiDeck } from '../../models/api-deck'
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

  @transaction()
  private updateDeck(deck: ApiDeck) {
    this.deckStore.update((state) => ({ ...state, deck }))
    this.deckStore.setLoading(false)
  }
}
