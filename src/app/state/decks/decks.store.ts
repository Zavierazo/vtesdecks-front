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
  currency: string
  restorableDecks: ApiDeck[]
  lastViewedDeckId: string | null
}

const initialState: DecksState = {
  params: {},
  hasMore: true,
  offset: 0,
  total: 0,
  currency: 'EUR',
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
  private readonly removed = new Set<string>()
  private readonly overrides = new Map<string, Partial<ApiDeck>>()
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

  updateCurrency(currency: string) {
    this.update((state) => ({ ...state, currency }))
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
    this.removed.clear()
    this.overrides.clear()
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
    this.entities.update((current) => {
      const existing = new Set(current.map((deck) => deck.id))
      return [
        ...current,
        ...entities
          .filter(
            (deck) => !existing.has(deck.id) && !this.removed.has(deck.id),
          )
          .map((deck) => ({ ...deck, ...this.overrides.get(deck.id) })),
      ]
    })
  }

  getEntities(): ApiDeck[] {
    return this.entities()
  }

  patchDeck(id: string, patch: Partial<ApiDeck>): void {
    this.overrides.set(id, { ...this.overrides.get(id), ...patch })
    this.entities.update((decks) =>
      decks.map((deck) => (deck.id === id ? { ...deck, ...patch } : deck)),
    )
  }

  removeDecks(ids: string[]): void {
    const deleted = new Set(ids)
    const loaded = this.entities().filter((deck) => deleted.has(deck.id)).length
    ids.forEach((id) => this.removed.add(id))
    this.entities.update((decks) =>
      decks.filter((deck) => !deleted.has(deck.id)),
    )
    this.update((state) => ({
      ...state,
      total: Math.max(0, state.total - ids.length),
      offset: Math.max(0, state.offset - loaded),
    }))
  }

  replaceDecks(decks: ApiDeck[]): void {
    this.entities.set(
      decks
        .filter((deck) => !this.removed.has(deck.id))
        .map((deck) => ({ ...deck, ...this.overrides.get(deck.id) })),
    )
  }

  markVisited(deckId: string) {
    this.entities.update((current) =>
      current.map((deck) =>
        deck.id === deckId ? { ...deck, visitStatus: 'VIEWED' } : deck,
      ),
    )
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
