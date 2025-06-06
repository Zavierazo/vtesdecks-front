import { Injectable, inject } from '@angular/core'
import { Params } from '@angular/router'
import { Observable } from 'rxjs'
import { ApiDeck } from './../../models/api-deck'
import { DecksState, DecksStore } from './decks.store'
@Injectable({
  providedIn: 'root',
})
export class DecksQuery {
  private readonly store = inject(DecksStore);


  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectAll(): Observable<ApiDeck[]> {
    return this.store.selectEntities()
  }

  selectTotal(): Observable<number> {
    return this.store.select((decks: DecksState) => decks.total)
  }

  selectParams(): Observable<Params> {
    return this.store.select((decks: DecksState) => decks.params)
  }

  selectRestorableDecks(): Observable<ApiDeck[]> {
    return this.store.select((decks: DecksState) => decks.restorableDecks)
  }

  getParam(key: string): any {
    return this.store.getValue().params[key]
  }

  getHasMore(): boolean {
    return this.store.getValue().hasMore
  }

  getOffset(): number {
    return this.store.getValue().offset
  }
}
