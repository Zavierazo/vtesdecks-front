import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiDeck } from './../../models/api-deck'
import { DeckState, DeckStore } from './deck.store'

@Injectable({
  providedIn: 'root',
})
export class DeckQuery {
  constructor(private readonly store: DeckStore) {}

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectDeck(): Observable<ApiDeck | undefined> {
    return this.store.select((decks: DeckState) => decks.deck)
  }

  getDeck(): ApiDeck | undefined {
    return this.store.getValue().deck
  }
}
