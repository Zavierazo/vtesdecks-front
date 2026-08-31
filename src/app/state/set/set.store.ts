import { computed, inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiSet, SetSortBy } from '@models'
import { IndexedDbService } from '@services'
import { map, Observable, shareReplay } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class SetStore {
  private readonly db = inject(IndexedDbService)

  static readonly dbStoreName = 'set'
  private readonly entities = signal<ApiSet[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly entityById = computed(
    () => new Map(this.entities().map((entity) => [entity.id, entity])),
  )
  private readonly entityByAbbrev = computed(
    () =>
      new Map(
        this.entities().map((entity) => [entity.abbrev.toLowerCase(), entity]),
      ),
  )
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  /** Resolves once the persisted sets have been restored, if any. */
  readonly ready: Promise<void>

  constructor() {
    this.ready = this.hydrate()
  }

  private async hydrate(): Promise<void> {
    const entities = await this.db.getAll<ApiSet>(SetStore.dbStoreName)
    if (entities.length) {
      this.entities.set(entities)
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
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }
  selectEntity(id: number): Observable<ApiSet | undefined> {
    return this.entities$.pipe(map(() => this.entityById().get(id)))
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
    return this.entityById().get(id)
  }

  getEntityByAbbrev(abbrev: string): ApiSet | undefined {
    return this.entityByAbbrev().get(abbrev.toLowerCase())
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  set(entities: ApiSet[]) {
    this.entities.update(() => entities)
    if (entities.length > 0) {
      void this.db.putAll(SetStore.dbStoreName, entities)
    }
  }

  upsert(id: number, entity: ApiSet) {
    this.entities.update((current) => [
      ...current.filter((c) => c.id !== id),
      entity,
    ])
    void this.db.put(SetStore.dbStoreName, entity)
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
