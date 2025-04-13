import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { map, Observable } from 'rxjs'
import { LocalStorageService } from '../../services/local-storage.service'
import { ApiLibrary } from './../../models/api-library'

export interface LibraryState {
  locale?: string
  lastUpdate?: Date
}

const initialState: LibraryState = {}

@Injectable({
  providedIn: 'root',
})
export class LibraryStore {
  static readonly stateStoreName = 'library_v1_state'
  static readonly entitiesStoreName = 'library_v1_entities'
  private readonly state = signal<LibraryState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiLibrary[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor(private readonly localStorage: LocalStorageService) {
    // Restore state from local storage
    const previousLocalState = this.localStorage.getValue<LibraryState>(
      LibraryStore.stateStoreName,
    )
    if (previousLocalState) {
      this.update(() => previousLocalState)
    }
    // Restore entities from local storage
    const previousLocalEntities = this.localStorage.getValue<ApiLibrary[]>(
      LibraryStore.entitiesStoreName,
    )
    if (previousLocalEntities) {
      this.set(previousLocalEntities)
    }
  }

  updateLastUpdate(locale: string, lastUpdate: Date) {
    this.update((state) => ({
      ...state,
      locale,
      lastUpdate,
    }))
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<LibraryState> {
    return this.state$
  }

  selectAll(): Observable<ApiLibrary[]> {
    return this.entities$
  }

  selectEntities(
    limitTo?: number,
    filterFn?: (entity: ApiLibrary) => boolean,
    sortBy?: keyof ApiLibrary,
    sortByOrder?: 'asc' | 'desc',
  ): Observable<ApiLibrary[]> {
    return this.entities$.pipe(
      map((current) => {
        let entities = [...current]
        if (filterFn) {
          entities = entities.filter(filterFn)
        }
        if (sortBy) {
          entities = entities.sort((a, b) => {
            if (a[sortBy] === b[sortBy]) {
              return 0
            }
            if (sortByOrder === 'asc') {
              return a[sortBy] > b[sortBy] ? 1 : -1
            } else {
              return a[sortBy] < b[sortBy] ? 1 : -1
            }
          })
        }
        if (limitTo) {
          entities = entities.slice(0, limitTo)
        }
        return entities
      }),
    )
  }

  selectEntity(id: number): Observable<ApiLibrary | undefined> {
    return this.entities$.pipe(
      map((entities) => entities.find((c) => c.id === id)),
    )
  }

  getEntities(
    filterFn?: (entity: ApiLibrary) => boolean,
    sortBy?: keyof ApiLibrary,
    sortByOrder?: 'asc' | 'desc',
  ): ApiLibrary[] {
    let entities = this.entities()
    if (filterFn) {
      entities = entities.filter(filterFn)
    }
    if (sortBy) {
      entities = entities.sort((a, b) => {
        if (a[sortBy] === b[sortBy]) {
          return 0
        }
        if (sortByOrder === 'asc') {
          return a[sortBy] > b[sortBy] ? 1 : -1
        } else {
          return a[sortBy] < b[sortBy] ? 1 : -1
        }
      })
    }
    return entities
  }

  getValue(): LibraryState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  getEntity(id: number): ApiLibrary | undefined {
    return this.entities().find((c) => c.id === id)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: LibraryState) => LibraryState) {
    this.state.update(updateFn)
    this.updateStorage()
  }

  set(entities: ApiLibrary[]) {
    console.log(entities)
    this.entities.update(() => entities)
    this.updateStorage()
  }

  upsert(id: number, entity: ApiLibrary) {
    this.entities.update((current) => [
      ...current.filter((c) => c.id !== id),
      entity,
    ])
    this.updateStorage()
  }

  private updateStorage(): void {
    const state = this.getValue()
    if (state) {
      this.localStorage.setValue(LibraryStore.stateStoreName, state)
    }
    const entities = this.getEntities()
    if (entities?.length > 0) {
      this.localStorage.setValue(LibraryStore.entitiesStoreName, entities)
    }
  }
}
