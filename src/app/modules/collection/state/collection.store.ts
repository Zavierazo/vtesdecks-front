import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { map, Observable } from 'rxjs'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionCard } from '../../../models/api-collection-card'

export interface CollectionQueryState {
  page: number
  pageSize: number
  sortBy: keyof ApiCollectionCard
  sortDirection: 'asc' | 'desc' | ''
  filters: [string, string | number | number[] | boolean | undefined][]
}

export interface CollectionState {
  query: CollectionQueryState
  totalPages?: number
  totalElements?: number
  binders?: ApiCollectionBinder[]
  creationDate?: Date
  modificationDate?: Date
}

const initialState: CollectionState = {
  query: {
    page: 0,
    pageSize: 20,
    sortBy: 'modificationDate',
    sortDirection: 'desc',
    filters: [],
  },
}

@Injectable({
  providedIn: 'root',
})
export class CollectionStore {
  static readonly storeName = 'collection'
  private readonly state = signal<CollectionState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiCollectionCard[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<CollectionState> {
    return this.state$
  }

  getValue(): CollectionState {
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

  update(updateFn: (value: CollectionState) => CollectionState) {
    this.state.update(updateFn)
  }

  updateQuery(updateFn: (value: CollectionQueryState) => CollectionQueryState) {
    this.state.update((state) => ({
      ...state,
      query: updateFn(state.query),
    }))
  }

  add(entities: ApiCollectionCard[]) {
    this.entities.update((current) => [...current, ...entities])
  }

  remove() {
    this.entities.update(() => [])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: CollectionState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  selectEntities(): Observable<ApiCollectionCard[]> {
    return this.entities$
  }

  getEntity(id: number): ApiCollectionCard | undefined {
    return this.entities().find((e) => e.id === id)
  }

  setEntities(entities?: ApiCollectionCard[]) {
    this.entities.update(() => entities ?? [])
  }

  addEntity(entity: ApiCollectionCard) {
    this.entities.update((current) => [
      entity,
      ...current.filter((e) => e.id !== entity.id),
    ])
  }

  updateEntity(entity: ApiCollectionCard) {
    this.entities.update((current) =>
      current.map((e) => (e.id === entity.id ? entity : e)),
    )
  }

  removeEntity(id: number) {
    this.entities.update((current) => current.filter((e) => e.id !== id))
  }

  setQueryFilters(filters: [string, string | number | boolean][]): void {
    this.state.update((state) => ({
      ...state,
      query: {
        ...state.query,
        filters,
      },
    }))
  }
}
