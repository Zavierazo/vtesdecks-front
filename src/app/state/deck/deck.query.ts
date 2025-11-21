import { Injectable, inject } from '@angular/core'
import { ApiDeck } from '@models'
import { Observable } from 'rxjs'
import { DeckState, DeckStore } from './deck.store'

@Injectable({
  providedIn: 'root',
})
export class DeckQuery {
  private readonly store = inject(DeckStore)

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
