import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  ApiCard,
  ApiCollectionCard,
  ApiDeckExtra,
  ApiDeckLimitedFormat,
  CryptFilter,
  DeckCryptSortBy,
  DeckLibrarySortBy,
} from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { map, Observable } from 'rxjs'
import { DeckBuilderQuery } from './deck-builder.query'

export interface DeckBuilderState {
  id?: string
  name?: string
  description?: string
  extra?: ApiDeckExtra
  collection: boolean
  published: boolean
  cards: ApiCard[]
  cryptFilter: CryptFilter
  cryptErrors: string[]
  cryptSortBy: DeckCryptSortBy
  libraryErrors: string[]
  librarySortBy: DeckLibrarySortBy
  saved: boolean
  collectionCards?: ApiCollectionCard[]
  validation?: (query: DeckBuilderQuery) => string[]
  customValidation?: (query: DeckBuilderQuery) => {
    cryptErrors?: string[]
    libraryErrors?: string[]
  }
}

@Injectable({
  providedIn: 'root',
})
export class DeckBuilderStore {
  private readonly cryptQuery = inject(CryptQuery)
  private readonly state = signal<DeckBuilderState>(this.getInitialState())
  private readonly state$ = toObservable(this.state)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  updateName(name: string): void {
    this.update((state) => ({ ...state, name }))
  }

  updateDescription(description?: string): void {
    this.update((state) => ({ ...state, description }))
  }

  updatePublished(published: boolean): void {
    this.update((state) => ({ ...state, published }))
  }

  updateCollection(collection: boolean): void {
    this.update((state) => ({ ...state, collection }))
  }

  addCard(id: number, type?: string): void {
    if (this.getValue().cards.find((c) => c.id === id)) {
      const cards = this.getValue().cards.map((c) =>
        c.id === id ? { ...c, number: c.number + 1 } : c,
      )
      this.update((state) => ({
        ...state,
        cards,
      }))
    } else {
      this.update((state) => ({
        ...state,
        cards: [...state.cards, { id, type, number: 1 }],
      }))
    }
  }

  removeCard(id: number): void {
    this.update((state) => ({
      ...state,
      cards: state.cards
        .map((c) => (c.id === id ? { ...c, number: c.number - 1 } : c))
        .filter((c) => c.number > 0),
    }))
  }

  setCryptErrors(errors: string[]): void {
    this.update((state) => ({ ...state, cryptErrors: errors }))
  }

  setLibraryErrors(errors: string[]): void {
    this.update((state) => ({ ...state, libraryErrors: errors }))
  }

  setSaved(saved: boolean): void {
    this.update((state) => ({ ...state, saved }))
  }

  setLimitedFormat(format?: ApiDeckLimitedFormat): void {
    this.update((state) => ({
      ...state,
      extra: format ? { limitedFormat: format } : undefined,
    }))
  }

  setCryptSortBy(sortBy: DeckCryptSortBy): void {
    this.update((state) => ({
      ...state,
      cryptSortBy: sortBy,
    }))
  }

  setLibrarySortBy(sortBy: DeckLibrarySortBy): void {
    this.update((state) => ({
      ...state,
      librarySortBy: sortBy,
    }))
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<DeckBuilderState> {
    return this.state$
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: DeckBuilderState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  getValue(): DeckBuilderState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  reset(): void {
    this.state.update(() => this.getInitialState())
    this.loading.update(() => false)
  }

  resetCryptFilter(): void {
    this.update((state) => ({
      ...state,
      cryptFilter: this.getInitialState().cryptFilter,
    }))
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: DeckBuilderState) => DeckBuilderState) {
    this.state.update(updateFn)
  }

  updateCollectionCards(collectionCards?: ApiCollectionCard[]) {
    this.state.update((state) => ({
      ...state,
      collectionCards,
    }))
  }

  private getInitialState(): DeckBuilderState {
    return {
      cards: [],
      cryptFilter: this.cryptQuery.getDefaultCryptFilter(),
      cryptErrors: [],
      cryptSortBy: 'name',
      libraryErrors: [],
      librarySortBy: 'name',
      published: true,
      saved: true,
      collection: false,
    }
  }
}
