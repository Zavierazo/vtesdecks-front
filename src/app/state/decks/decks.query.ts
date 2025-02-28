import { Injectable } from '@angular/core'
import { Params } from '@angular/router'
import { QueryEntity } from '@datorama/akita'
import { Observable } from 'rxjs'
import { ApiDeck } from './../../models/api-deck'
import { DecksState, DecksStore } from './decks.store'
@Injectable({
  providedIn: 'root',
})
export class DecksQuery extends QueryEntity<DecksState, ApiDeck> {
  constructor(protected override store: DecksStore) {
    super(store)
  }

  selectTotal(): Observable<number> {
    return this.select((decks: DecksState) => decks.total)
  }

  selectParams(): Observable<Params> {
    return this.select((decks: DecksState) => decks.params)
  }

  selectRestorableDecks(): Observable<ApiDeck[]> {
    return this.select((decks: DecksState) => decks.restorableDecks)
  }

  getParam(key: string): any {
    return this.getValue().params[key]
  }

  getHasMore(): boolean {
    return this.getValue().hasMore
  }

  getOffset(): number {
    return this.getValue().offset
  }
}
