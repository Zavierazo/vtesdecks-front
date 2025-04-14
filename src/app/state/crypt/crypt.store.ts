import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { map, Observable } from 'rxjs'
import { ApiCrypt } from '../../models/api-crypt'
import { LocalStorageService } from '../../services/local-storage.service'

export interface CryptState {
  locale?: string
  lastUpdate?: Date
}

const initialState: CryptState = {}

@Injectable({
  providedIn: 'root',
})
export class CryptStore {
  static readonly stateStoreName = 'crypt_v1_state'
  static readonly entitiesStoreName = 'crypt_v1_entities'
  private readonly state = signal<CryptState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiCrypt[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor(private readonly localStorage: LocalStorageService) {
    // Restore entities from local storage
    const previousLocalEntities = this.localStorage.getValue<ApiCrypt[]>(
      CryptStore.entitiesStoreName,
    )
    if (previousLocalEntities) {
      this.set(previousLocalEntities)
      // Restore state from local storage
      const previousLocalState = this.localStorage.getValue<CryptState>(
        CryptStore.stateStoreName,
      )
      if (previousLocalState) {
        this.update(() => previousLocalState)
      }
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

  selectState(): Observable<CryptState> {
    return this.state$
  }

  selectAll(): Observable<ApiCrypt[]> {
    return this.entities$
  }

  selectEntities(
    limitTo?: number,
    filterFn?: (entity: ApiCrypt) => boolean,
    sortBy?: keyof ApiCrypt,
    sortByOrder?: 'asc' | 'desc',
  ): Observable<ApiCrypt[]> {
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

  selectEntity(id: number): Observable<ApiCrypt | undefined> {
    return this.entities$.pipe(
      map((entities) => entities.find((c) => c.id === id)),
    )
  }

  getEntities(
    filterFn?: (entity: ApiCrypt) => boolean,
    sortBy?: keyof ApiCrypt,
    sortByOrder?: 'asc' | 'desc',
  ): ApiCrypt[] {
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

  getValue(): CryptState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  getEntity(id: number): ApiCrypt | undefined {
    return this.entities().find((c) => c.id === id)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: CryptState) => CryptState) {
    this.state.update(updateFn)
    this.updateStorage()
  }

  set(entities: ApiCrypt[]) {
    this.entities.update(() => entities)
    this.updateStorage()
  }

  upsert(id: number, entity: ApiCrypt) {
    this.entities.update((current) => [
      ...current.filter((c) => c.id !== id),
      entity,
    ])
    this.updateStorage()
  }

  private updateStorage(): void {
    const state = this.getValue()
    if (state?.lastUpdate && state?.locale) {
      this.localStorage.setValue(CryptStore.stateStoreName, state)
    }
    const entities = this.getEntities()
    if (entities?.length > 0) {
      this.localStorage.setValue(CryptStore.entitiesStoreName, entities)
    }
  }
}
