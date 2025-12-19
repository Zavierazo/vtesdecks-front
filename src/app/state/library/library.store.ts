import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  ApiClanStat,
  ApiDisciplineStat,
  ApiLibrary,
  LibrarySortBy,
} from '@models'
import { LocalStorageService } from '@services'
import { trigramSimilarity } from '@utils'
import { map, Observable } from 'rxjs'

export interface LibraryStats {
  total: number
  disciplines: ApiDisciplineStat[]
  disciplineFactor?: number
  cryptTotal: number
  cryptClans: ApiClanStat[]
  cryptDisciplines: ApiDisciplineStat[]
  cryptSects: string[]
}
export interface LibraryState {
  locale?: string
  lastUpdate?: Date
}

const initialState: LibraryState = {}

@Injectable({
  providedIn: 'root',
})
export class LibraryStore {
  private readonly localStorage = inject(LocalStorageService)

  static readonly stateStoreName = 'library_v1_state'
  static readonly entitiesStoreName = 'library_v1_entities'
  private readonly state = signal<LibraryState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiLibrary[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor() {
    // Restore entities from local storage
    const previousLocalEntities = this.localStorage.getValue<ApiLibrary[]>(
      LibraryStore.entitiesStoreName,
    )
    if (previousLocalEntities) {
      this.set(previousLocalEntities)
      // Restore state from local storage
      const previousLocalState = this.localStorage.getValue<LibraryState>(
        LibraryStore.stateStoreName,
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

  getLastUpdate(): Date | undefined {
    return this.state().lastUpdate
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
    sortBy?: LibrarySortBy,
    sortByOrder?: 'asc' | 'desc',
    nameFilter?: string,
    stats?: LibraryStats,
  ): Observable<ApiLibrary[]> {
    if (stats) {
      stats.disciplineFactor = this.getDisciplineFactor(stats)
    }
    return this.entities$.pipe(
      map((current) => {
        let entities = [...current]
        if (filterFn) {
          entities = entities.filter(filterFn)
        }
        if (sortBy) {
          if (sortBy === 'relevance') {
            entities = entities.sort((a, b) => {
              const aWeight = this.getRelevanceWeight(a, stats)
              const bWeight = this.getRelevanceWeight(b, stats)
              if (aWeight === bWeight) {
                return this.sort(a['name'], b['name'], 'asc')
              }
              if (sortByOrder === 'asc') {
                return aWeight > bWeight ? 1 : -1
              } else {
                return aWeight < bWeight ? 1 : -1
              }
            })
          } else if (sortBy === 'trigramSimilarity') {
            entities = entities.sort((a, b) =>
              this.sortTrigramSimilarity(a, b, nameFilter, sortByOrder),
            )
          } else {
            entities = entities.sort((a, b) =>
              this.sort(a[sortBy], b[sortBy], sortByOrder),
            )
          }
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
    sortBy?: LibrarySortBy,
    sortByOrder?: 'asc' | 'desc',
    nameFilter?: string,
  ): ApiLibrary[] {
    let entities = this.entities()
    if (filterFn) {
      entities = entities.filter(filterFn)
    }
    if (sortBy === 'trigramSimilarity') {
      entities = entities.sort((a, b) =>
        this.sortTrigramSimilarity(a, b, nameFilter, sortByOrder),
      )
    } else if (sortBy && sortBy !== 'relevance') {
      entities = entities.sort((a, b) =>
        this.sort(a[sortBy], b[sortBy], sortByOrder),
      )
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
    if (state?.locale) {
      this.localStorage.setValue(LibraryStore.stateStoreName, state)
    }
    const entities = this.getEntities()
    if (entities?.length > 0) {
      this.localStorage.setValue(LibraryStore.entitiesStoreName, entities)
    }
  }

  private getRelevanceWeight(entity: ApiLibrary, stats?: LibraryStats): number {
    // Only apply relevance order if there are at least 40 cards
    if (!stats || stats.total < 40 || entity.deckPopularity === 0) {
      return 0
    }
    // Filter out cards with clans that are not in the crypt clans
    if (
      entity.clans.length > 0 &&
      !entity.clans.every((clan) =>
        stats.cryptClans.find((c) => c.clans[0] === clan),
      )
    ) {
      return 0
    }
    // Filter out cards with invalid disciplines
    if (
      entity.disciplines.length > 0 &&
      !entity.disciplines.some((discipline) =>
        stats.cryptDisciplines.find((d) => d.disciplines[0] === discipline),
      )
    ) {
      return 0
    }
    // Filter out cards with invalid sects
    if (
      entity.sects.length > 0 &&
      !entity.sects.some((sect) => stats.cryptSects.includes(sect))
    ) {
      return 0
    }
    // Apply relevance order
    return (
      entity.deckPopularity *
      this.getClanMultiplier(entity.clans, stats) *
      this.getDisciplineMultiplier(entity.disciplines, stats)
    )
  }

  private getClanMultiplier(clans: string[], stats: LibraryStats): number {
    if (clans.length === 0 || stats.cryptClans.length === 0) {
      return 1
    }
    const clanStats = clans.reduce((acc, clan) => {
      const statInferior = stats.cryptClans.find((c) => c.clans[0] === clan)
      if (statInferior) {
        acc += statInferior.number
      }
      return acc
    }, 0)
    if (!clanStats) {
      return 0.1
    }
    return clanStats / stats.cryptTotal
  }

  private getDisciplineMultiplier(
    disciplines: string[],
    stats: LibraryStats,
  ): number {
    const disciplineFactor = stats.disciplineFactor ?? 1
    if (disciplines.length === 0 || stats.disciplines.length === 0) {
      return disciplineFactor
    }
    const disciplineStats = disciplines.reduce((acc, discipline) => {
      const statInferior = stats.disciplines.find(
        (d) => d.disciplines[0] === discipline,
      )
      if (statInferior) {
        acc += statInferior.inferior
      }
      return acc
    }, 0)
    return disciplineStats / disciplineFactor
  }

  private getDisciplineFactor(stats: LibraryStats): number {
    return (
      stats.disciplines.reduce(
        (acc, discipline) => acc + discipline.inferior,
        0,
      ) / stats.total
    )
  }

  private sortTrigramSimilarity(
    a: ApiLibrary,
    b: ApiLibrary,
    nameFilter?: string,
    sortByOrder?: 'asc' | 'desc',
  ): number {
    const aWeight = trigramSimilarity(a.name, nameFilter)
    const bWeight = trigramSimilarity(b.name, nameFilter)
    if (aWeight === bWeight) {
      return this.sort(a['name'], b['name'], 'asc')
    }
    return this.sort(aWeight, bWeight, sortByOrder)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sort(a: any, b: any, sortByOrder?: 'asc' | 'desc'): number {
    if (a === b) {
      return 0
    }
    if (sortByOrder === 'asc') {
      if (a === undefined) return -1
      if (b === undefined) return 1
      return a > b ? 1 : -1
    } else {
      if (a === undefined) return 1
      if (b === undefined) return -1
      return a < b ? 1 : -1
    }
  }
}
