import { computed, inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  ApiClanStat,
  ApiDisciplineStat,
  ApiLibrary,
  LibraryFilter,
  LibrarySortBy,
} from '@models'
import { IndexedDbService } from '@services'
import {
  getSetAbbrev,
  matchesSetSelection,
  searchIncludes,
  trigramSimilarity,
} from '@utils'
import { map, Observable, shareReplay } from 'rxjs'

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
  private readonly db = inject(IndexedDbService)

  static readonly dbStoreName = 'library'
  static readonly dbStateName = 'library_state'
  private readonly state = signal<LibraryState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiLibrary[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly entityById = computed(
    () => new Map(this.entities().map((entity) => [entity.id, entity])),
  )
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  /** Read-only view of the catalog, so queries can derive from it. */
  readonly entitiesSignal = this.entities.asReadonly()

  /** Resolves once the persisted catalog has been restored, if any. */
  readonly ready: Promise<void>

  constructor() {
    this.ready = this.hydrate()
  }

  private async hydrate(): Promise<void> {
    const entities = await this.db.getAll<ApiLibrary>(LibraryStore.dbStoreName)
    if (entities.length) {
      this.entities.set(entities)
      const state = await this.db.getMeta<LibraryState>(
        LibraryStore.dbStateName,
      )
      if (state) {
        this.state.set(state)
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
    priorityIds?: number[],
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
        if (priorityIds?.length) {
          const priorityMap = new Map(priorityIds.map((id, idx) => [id, idx]))
          entities = entities.sort((a, b) => {
            const aIdx = priorityMap.has(a.id)
              ? priorityMap.get(a.id)!
              : Number.MAX_SAFE_INTEGER
            const bIdx = priorityMap.has(b.id)
              ? priorityMap.get(b.id)!
              : Number.MAX_SAFE_INTEGER
            if (aIdx !== bIdx) return aIdx - bIdx
            return 0
          })
        }
        if (limitTo) {
          entities = entities.slice(0, limitTo)
        }
        return entities
      }),
      // Templates subscribe to the same query through several async pipes
      shareReplay({ bufferSize: 1, refCount: true }),
    )
  }

  selectEntity(id: number): Observable<ApiLibrary | undefined> {
    return this.entities$.pipe(map(() => this.entityById().get(id)))
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
    return this.entityById().get(id)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: LibraryState) => LibraryState) {
    this.state.update(updateFn)
    const state = this.getValue()
    if (state?.locale) {
      void this.db.setMeta(LibraryStore.dbStateName, state)
    }
  }

  set(entities: ApiLibrary[]) {
    this.entities.update(() => entities)
    if (entities.length > 0) {
      void this.db.putAll(LibraryStore.dbStoreName, entities)
    }
  }

  upsert(id: number, entity: ApiLibrary) {
    this.entities.update((current) => [
      ...current.filter((c) => c.id !== id),
      entity,
    ])
    void this.db.put(LibraryStore.dbStoreName, entity)
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
      const cardTypes = entity.type.split('/')
      const typeMatch =
        (filter.typeMode ?? 'or') === 'or'
          ? filter.types.some((type) => cardTypes.includes(type))
          : filter.types.every((type) => cardTypes.includes(type))
      if (!typeMatch) {
        return false
      }
    }
    if (filter.notTypes && filter.notTypes.length > 0) {
      const cardTypes = entity.type.split('/')
      if (filter.notTypes.some((type) => cardTypes.includes(type))) {
        return false
      }
    }
    const clanMatches = (clan: string) =>
      clan === 'none' ? entity.clans.length === 0 : entity.clans.includes(clan)
    if (
      filter.clans &&
      filter.clans.length > 0 &&
      !filter.clans.some(clanMatches)
    ) {
      return false
    }
    if (filter.notClans?.some(clanMatches)) {
      return false
    }
    const disciplineMatches = (discipline: string) =>
      discipline === 'none'
        ? entity.disciplines.length === 0
        : entity.disciplines.includes(discipline)
    if (filter.disciplines && filter.disciplines.length > 0) {
      const disciplineMatch =
        (filter.disciplineMode ?? 'and') === 'and'
          ? filter.disciplines.every(disciplineMatches)
          : filter.disciplines.some(disciplineMatches)
      if (!disciplineMatch) {
        return false
      }
    }
    if (filter.notDisciplines?.some(disciplineMatches)) {
      return false
    }
    if (filter.sect) {
      if (filter.sect === 'none') {
        return entity.sects.length === 0
      } else if (!entity.sects.includes(filter.sect)) {
        return false
      }
    }
    const pathMatches = (path: string) =>
      path === 'none' ? !entity.path : entity.path === path
    if (
      Array.isArray(filter.paths) &&
      filter.paths.length > 0 &&
      !filter.paths.some(pathMatches)
    ) {
      return false
    }
    if (Array.isArray(filter.notPaths) && filter.notPaths.some(pathMatches)) {
      return false
    }
    if (filter.title) {
      if (filter.title === 'none') {
        return entity.titles.length === 0
      } else if (!entity.titles.includes(filter.title)) {
        return false
      }
    }
    if (!matchesSetSelection(entity.sets, filter.sets, filter.notSets)) {
      return false
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
    if (filter.convictionCostSlider) {
      const convictionCostMin = filter.convictionCostSlider[0]
      const convictionCostMax = filter.convictionCostSlider[1]
      const convictionCost = entity.convictionCost ?? 0
      if (
        convictionCost != -1 &&
        (convictionCost < convictionCostMin ||
          convictionCost > convictionCostMax)
      ) {
        return false
      }
    }
    if (filter.trifle === 'trifle' && !entity.trifle) {
      return false
    }
    if (filter.trifle === 'non_trifle' && entity.trifle) {
      return false
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
