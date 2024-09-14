import { Observable } from 'rxjs'
import { ApiDeck } from './../../models/api-deck'
import { DeckState, DeckStore } from './deck.store'
import { Injectable } from '@angular/core'
import { Query } from '@datorama/akita'

@Injectable({
  providedIn: 'root',
})
export class DeckQuery extends Query<DeckState> {
  constructor(protected override store: DeckStore) {
    super(store)
  }

  selectDeck(): Observable<ApiDeck | undefined> {
    return this.select((decks: DeckState) => decks.deck)
  }

  getDeck(): ApiDeck | undefined {
    return this.getValue().deck
  }
}
