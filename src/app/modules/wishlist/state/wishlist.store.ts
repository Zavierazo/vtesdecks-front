import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiWishlistCard } from '@models'
import { map, Observable } from 'rxjs'

export interface WishlistQueryState {
  page: number
  pageSize: number
  sortBy: keyof ApiWishlistCard
  sortDirection: 'asc' | 'desc' | ''
  filters: [string, string | number | number[] | boolean | undefined][]
}

export interface WishlistState {
  query: WishlistQueryState
  totalPages?: number
  totalElements?: number
  publicVisibility?: boolean
  creationDate?: Date
  modificationDate?: Date
}

const initialState: WishlistState = {
  query: {
    page: 0,
    pageSize: 20,
    sortBy: 'cardName',
    sortDirection: 'asc',
    filters: [],
  },
  // No GET endpoint exposes the owner's current visibility, so we assume the
  // documented default (public) and update it from PUT /visibility responses.
  publicVisibility: true,
}

@Injectable({
  providedIn: 'root',
})
export class WishlistStore {
  static readonly storeName = 'wishlist'
  private readonly state = signal<WishlistState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiWishlistCard[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)
  private readonly loadingBackground = signal<boolean>(false)
  private readonly loadingBackground$ = toObservable(this.loadingBackground)

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectLoadingBackground(): Observable<boolean> {
    return this.loadingBackground$
  }

  selectState(): Observable<WishlistState> {
    return this.state$
  }

  getValue(): WishlistState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  getLoadingBackground(): boolean {
    return this.loadingBackground()
  }

  reset(): void {
    this.state.update(() => initialState)
    this.entities.update(() => [])
    this.loading.update(() => false)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  setLoadingBackground(value = false) {
    this.loadingBackground.update(() => value)
  }

  update(updateFn: (value: WishlistState) => WishlistState) {
    this.state.update(updateFn)
  }

  updateQuery(updateFn: (value: WishlistQueryState) => WishlistQueryState) {
    this.state.update((state) => ({
      ...state,
      query: updateFn(state.query),
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: WishlistState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  selectEntities(): Observable<ApiWishlistCard[]> {
    return this.entities$
  }

  getEntities(): ApiWishlistCard[] {
    return this.entities()
  }

  getEntity(id: number): ApiWishlistCard | undefined {
    return this.entities().find((e) => e.id === id)
  }

  setEntities(entities?: ApiWishlistCard[]) {
    this.entities.update(() => entities ?? [])
  }

  addEntity(entity: ApiWishlistCard) {
    this.entities.update((current) => [
      entity,
      ...current.filter((e) => e.id !== entity.id),
    ])
  }

  updateEntity(entity: ApiWishlistCard) {
    this.entities.update((current) =>
      current.map((e) => (e.id === entity.id ? entity : e)),
    )
  }

  removeEntity(id: number) {
    this.entities.update((current) => current.filter((e) => e.id !== id))
  }
}
