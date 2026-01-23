import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { Params } from '@angular/router'
import { ApiDeck } from '@models'
import { map, Observable } from 'rxjs'

export interface DecksState {
  params: Params
  hasMore: boolean
  offset: number
  total: number
  restorableDecks: ApiDeck[]
  lastViewedDeckId: string | null
}

const initialState: DecksState = {
  params: {},
  hasMore: true,
  offset: 0,
  total: 0,
  restorableDecks: [],
  lastViewedDeckId: null,
}

@Injectable({
  providedIn: 'root',
})
export class DecksStore {
  static readonly storeName = 'decks'
  private readonly state = signal<DecksState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiDeck[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  updatePage(hasMore: boolean, offset: number) {
    this.update((state) => ({
      ...state,
      hasMore,
      offset,
    }))
  }

  updateParams(params: Params) {
    this.update((state) => ({
      ...state,
      params: params,
    }))
  }

  updateTotal(total: number) {
    this.update((state) => ({
      ...state,
      total,
    }))
  }

  updateRestorableDecks(restorableDecks: ApiDeck[]) {
    this.update((state) => ({
      ...state,
      restorableDecks,
    }))
  }

  setLastViewedDeckId(deckId: string | null) {
    this.update((state) => ({
      ...state,
      lastViewedDeckId: deckId,
    }))
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<DecksState> {
    return this.state$
  }

  getValue(): DecksState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  reset(): void {
    this.state.update(() => initialState)
    this.entities.update(() => [])
    this.loading.update(() => false)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: DecksState) => DecksState) {
    this.state.update(updateFn)
  }

  add(entities: ApiDeck[]) {
    this.entities.update((current) => [...current, ...entities])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: DecksState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  selectEntities(): Observable<ApiDeck[]> {
    return this.entities$
  }

  isEmpty(): boolean {
    return this.entities().length === 0
  }
}
