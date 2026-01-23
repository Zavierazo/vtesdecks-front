import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  ApiClanStat,
  ApiDisciplineStat,
  ApiLibrary,
  LibraryFilter,
  LibrarySortBy,
} from '@models'
import { LocalStorageService } from '@services'
import { getSetAbbrev, searchIncludes, trigramSimilarity } from '@utils'
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
    filter?: LibraryFilter,
    sortBy?: LibrarySortBy,
    sortByOrder?: 'asc' | 'desc',
    stats?: LibraryStats,
  ): Observable<ApiLibrary[]> {
    if (stats) {
      stats.disciplineFactor = this.getDisciplineFactor(stats)
    }
    return this.entities$.pipe(
      map((current) => {
        let entities = [...current]
        if (filter) {
          entities = entities.filter((entity) =>
            this.filterEntity(entity, filter),
          )
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
              this.sortTrigramSimilarity(a, b, filter?.name, sortByOrder),
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
    filter?: LibraryFilter,
    sortBy?: LibrarySortBy,
    sortByOrder?: 'asc' | 'desc',
  ): ApiLibrary[] {
    let entities = this.entities()
    if (filter) {
      entities = entities.filter((entity) => this.filterEntity(entity, filter))
    }
    if (sortBy === 'trigramSimilarity') {
      entities = entities.sort((a, b) =>
        this.sortTrigramSimilarity(a, b, filter?.name, sortByOrder),
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
    const aNameWeight = trigramSimilarity(a.name, nameFilter)
    const aAkaWeight = a.aka ? trigramSimilarity(a.aka, nameFilter) : 0
    const bNameWeight = trigramSimilarity(b.name, nameFilter)
    const bAkaWeight = b.aka ? trigramSimilarity(b.aka, nameFilter) : 0
    const aWeight = Math.max(aNameWeight, aAkaWeight)
    const bWeight = Math.max(bNameWeight, bAkaWeight)
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
  private filterEntity(entity: ApiLibrary, filter: LibraryFilter): boolean {
    const name = filter.name
    if (name && !searchIncludes(entity.name, name)) {
      if (entity.i18n?.name) {
        return searchIncludes(entity.i18n.name, name)
      } else if (entity.aka) {
        return searchIncludes(entity.aka, name)
      } else {
        return false
      }
    }
    if (filter.printOnDemand && !entity.printOnDemand) {
      return false
    }
    if (filter.types && filter.types.length > 0) {
      let typeMatch = false
      for (const type of filter.types) {
        const types = entity.type.split('/')
        if (types.includes(type)) {
          typeMatch = true
        }
      }
      if (!typeMatch) {
        return false
      }
    }
    if (filter.clans && filter.clans.length > 0) {
      let clanMatch = false
      for (const clan of filter.clans) {
        if (
          (clan === 'none' && entity.clans.length === 0) ||
          entity.clans.includes(clan)
        ) {
          clanMatch = true
        }
      }
      if (!clanMatch) {
        return false
      }
    }
    if (filter.disciplines) {
      for (const discipline of filter.disciplines) {
        if (discipline === 'none' && entity.disciplines.length === 0) {
          continue
        } else if (!entity.disciplines.includes(discipline)) {
          return false
        }
      }
    }
    if (filter.sect) {
      if (filter.sect === 'none') {
        return entity.sects.length === 0
      } else if (!entity.sects.includes(filter.sect)) {
        return false
      }
    }
    if (filter.path && entity.path !== filter.path) {
      return false
    }
    if (filter.title) {
      if (filter.title === 'none') {
        return entity.titles.length === 0
      } else if (!entity.titles.includes(filter.title)) {
        return false
      }
    }
    if (filter.set) {
      return entity.sets.some((set) => set.startsWith(filter.set + ':'))
    }
    if (filter.bloodCostSlider) {
      const bloodCostMin = filter.bloodCostSlider[0]
      const bloodCostMax = filter.bloodCostSlider[1]
      const bloodCost = entity.bloodCost ?? 0
      if (
        bloodCost != -1 &&
        (bloodCost < bloodCostMin || bloodCost > bloodCostMax)
      ) {
        return false
      }
    }
    if (filter.poolCostSlider) {
      const poolCostMin = filter.poolCostSlider[0]
      const poolCostMax = filter.poolCostSlider[1]
      const poolCost = entity.poolCost ?? 0
      if (
        poolCost != -1 &&
        (poolCost < poolCostMin || poolCost > poolCostMax)
      ) {
        return false
      }
    }
    if (filter.taints) {
      for (const taint of filter.taints) {
        if (!entity.taints.includes(taint)) {
          return false
        }
      }
    }
    if (filter.cardText && !searchIncludes(entity.text, filter.cardText)) {
      if (entity.i18n?.text) {
        return searchIncludes(entity.i18n.text, filter.cardText)
      } else {
        return false
      }
    }
    if (filter.limitedFormat && filter.customLimitedFormat) {
      if (filter.customLimitedFormat.banned.crypt[entity.id]) {
        return false
      }
      if (filter.customLimitedFormat.banned.library[entity.id]) {
        return false
      }
      if (filter.customLimitedFormat.allowed.crypt[entity.id]) {
        return true
      }
      if (filter.customLimitedFormat.allowed.library[entity.id]) {
        return true
      }
      if (
        !Object.keys(filter.customLimitedFormat.sets).some((set) =>
          entity.sets.some((entitySet) => getSetAbbrev(entitySet) === set),
        )
      ) {
        return false
      }
    }
    if (filter.predefinedLimitedFormat) {
      if (
        !entity.limitedFormats?.includes(Number(filter.predefinedLimitedFormat))
      ) {
        return false
      }
    }
    if (filter.artist) {
      if (!searchIncludes(entity.artist, filter.artist)) {
        return false
      }
    }
    return true
  }
}
