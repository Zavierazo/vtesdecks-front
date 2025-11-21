import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiSet, SetSortBy } from '@models'
import { map, Observable } from 'rxjs'
import { LocalStorageService } from '../../services/local-storage.service'

@Injectable({
  providedIn: 'root',
})
export class SetStore {
  private readonly localStorage = inject(LocalStorageService)

  static readonly entitiesStoreName = 'set_v1_entities'
  private readonly entities = signal<ApiSet[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor() {
    // Restore entities from local storage
    const previousLocalEntities = this.localStorage.getValue<ApiSet[]>(
      SetStore.entitiesStoreName,
    )
    if (previousLocalEntities) {
      this.set(previousLocalEntities)
    }
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectAll(): Observable<ApiSet[]> {
    return this.entities$
  }

  selectEntities(
    limitTo?: number,
    filterFn?: (entity: ApiSet) => boolean,
    sortBy?: SetSortBy,
    sortByOrder?: 'asc' | 'desc',
  ): Observable<ApiSet[]> {
    return this.entities$.pipe(
      map((current) => {
        let entities = [...current]
        if (filterFn) {
          entities = entities.filter(filterFn)
        }
        if (sortBy) {
          entities = entities.sort((a, b) =>
            this.sort(a[sortBy], b[sortBy], sortByOrder),
          )
        }
        if (limitTo) {
          entities = entities.slice(0, limitTo)
        }
        return entities
      }),
    )
  }
  selectEntity(id: number): Observable<ApiSet | undefined> {
    return this.entities$.pipe(
      map((entities) => entities.find((c) => c.id === id)),
    )
  }

  selectEntityByAbbrev(abbrev: string): Observable<ApiSet | undefined> {
    return this.entities$.pipe(
      map((entities) => entities.find((c) => c.abbrev === abbrev)),
    )
  }

  getEntities(
    filterFn?: (entity: ApiSet) => boolean,
    sortBy?: SetSortBy,
    sortByOrder?: 'asc' | 'desc',
  ): ApiSet[] {
    let entities = this.entities()
    if (filterFn) {
      entities = entities.filter(filterFn)
    }
    if (sortBy) {
      entities = entities.sort((a, b) =>
        this.sort(a[sortBy], b[sortBy], sortByOrder),
      )
    }
    return entities
  }

  getLoading(): boolean {
    return this.loading()
  }

  getEntity(id: number): ApiSet | undefined {
    return this.entities().find((c) => c.id === id)
  }

  getEntityByAbbrev(abbrev: string): ApiSet | undefined {
    return this.entities().find((c) => c.abbrev === abbrev)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  set(entities: ApiSet[]) {
    this.entities.update(() => entities)
    this.updateStorage()
  }

  upsert(id: number, entity: ApiSet) {
    this.entities.update((current) => [
      ...current.filter((c) => c.id !== id),
      entity,
    ])
    this.updateStorage()
  }

  private updateStorage(): void {
    const entities = this.getEntities()
    if (entities?.length > 0) {
      this.localStorage.setValue(SetStore.entitiesStoreName, entities)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sort(a: any, b: any, order?: 'asc' | 'desc'): number {
    if (a === b) {
      return 0
    }
    if (a === undefined && b !== undefined) {
      return -1
    } else if (a !== undefined && b === undefined) {
      return 1
    } else if (order === 'asc') {
      return a > b ? 1 : -1
    } else {
      return a < b ? 1 : -1
    }
  }
}
