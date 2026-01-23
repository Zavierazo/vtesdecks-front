import { inject, Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import {
  ApiClanStat,
  ApiCrypt,
  ApiDisciplineStat,
  CryptFilter,
  CryptSortBy,
} from '@models'
import { LocalStorageService } from '@services'
import { getSetAbbrev, searchIncludes, trigramSimilarity } from '@utils'
import { map, Observable } from 'rxjs'

export interface CryptStats {
  total: number
  minGroup: number
  maxGroup: number
  clans: ApiClanStat[]
  disciplines: ApiDisciplineStat[]
  disciplineFactor?: number
}

export interface CryptState {
  locale?: string
  lastUpdate?: Date
}

const initialState: CryptState = {}

@Injectable({
  providedIn: 'root',
})
export class CryptStore {
  private readonly localStorage = inject(LocalStorageService)

  static readonly stateStoreName = 'crypt_v1_state'
  static readonly entitiesStoreName = 'crypt_v1_entities'
  private readonly state = signal<CryptState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly entities = signal<ApiCrypt[]>([])
  private readonly entities$ = toObservable(this.entities)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  constructor() {
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

  getLastUpdate(): Date | undefined {
    return this.state().lastUpdate
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
    filter?: CryptFilter,
    sortBy?: CryptSortBy,
    sortByOrder?: 'asc' | 'desc',
    stats?: CryptStats,
  ): Observable<ApiCrypt[]> {
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
        // Check if sortBy is a valid key of ApiCrypt
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

  selectEntity(id: number): Observable<ApiCrypt | undefined> {
    return this.entities$.pipe(
      map((entities) => entities.find((c) => c.id === id)),
    )
  }

  getEntities(
    filter?: CryptFilter,
    sortBy?: CryptSortBy,
    sortByOrder?: 'asc' | 'desc',
  ): ApiCrypt[] {
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
    if (state?.locale) {
      this.localStorage.setValue(CryptStore.stateStoreName, state)
    }
    const entities = this.getEntities()
    if (entities?.length > 0) {
      this.localStorage.setValue(CryptStore.entitiesStoreName, entities)
    }
  }

  private getRelevanceWeight(entity: ApiCrypt, stats?: CryptStats): number {
    // Only apply relevance order if there are at least 6 cards
    if (!stats || stats.total < 6 || entity.deckPopularity === 0) {
      return 0
    }
    // Filter out cards with invalid group
    if (
      (entity.group > 0 && entity.group < stats.minGroup) ||
      entity.group > stats.maxGroup
    ) {
      return 0
    }
    return (
      entity.deckPopularity *
      (this.getClanMultiplier(entity.clan, stats) *
        this.getDisciplineMultiplier(
          entity.superiorDisciplines,
          entity.disciplines,
          stats,
        ))
    )
  }

  private getClanMultiplier(clan: string, stats: CryptStats): number {
    if (!clan || stats.clans.length === 0) {
      return 1
    }
    const clanStats = stats.clans.find((c) => c.clans[0] === clan)
    if (!clanStats) {
      return 0.1
    }
    return clanStats.number / stats.total
  }

  private getDisciplineMultiplier(
    superiorDisciplines: string[],
    disciplines: string[],
    stats: CryptStats,
  ): number {
    if (stats.disciplines.length === 0 || !stats.disciplineFactor) {
      return 1
    }
    const cardSuperiorStats = superiorDisciplines.reduce((acc, discipline) => {
      const statSuperior = stats.disciplines.find(
        (d) => d.disciplines[0] === discipline,
      )
      if (statSuperior) {
        acc += statSuperior.superior
      }
      return acc
    }, 0)
    const cardInferiorStats = disciplines.reduce((acc, discipline) => {
      const statInferior = stats.disciplines.find(
        (d) => d.disciplines[0] === discipline,
      )
      if (statInferior) {
        acc += statInferior.inferior
      }
      return acc
    }, 0)
    return (cardSuperiorStats + cardInferiorStats) / stats.disciplineFactor
  }

  private getDisciplineFactor(stats: CryptStats): number {
    return (
      stats.disciplines.reduce(
        (acc, discipline) =>
          acc + discipline.superior * 2 + discipline.inferior,
        0,
      ) / stats.total
    )
  }

  private sortTrigramSimilarity(
    a: ApiCrypt,
    b: ApiCrypt,
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

  private filterEntity(entity: ApiCrypt, filter: CryptFilter): boolean {
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
    if (
      filter.clans &&
      filter.clans.length > 0 &&
      !filter.clans.includes(entity.clan)
    ) {
      return false
    }
    if (filter.disciplines) {
      for (const discipline of filter.disciplines) {
        if (!entity.disciplines.includes(discipline)) {
          return false
        }
      }
    }
    if (filter.superiorDisciplines) {
      for (const superiorDiscipline of filter.superiorDisciplines) {
        if (!entity.superiorDisciplines.includes(superiorDiscipline)) {
          return false
        }
      }
    }
    if (filter.groupSlider) {
      const groupMin = filter.groupSlider[0]
      const groupMax = filter.groupSlider[1]
      const group = entity.group
      if (group > 0 && (group < groupMin || group > groupMax)) {
        return false
      }
    }
    if (filter.capacitySlider) {
      const capacityMin = filter.capacitySlider[0]
      const capacityMax = filter.capacitySlider[1]
      if (entity.capacity < capacityMin || entity.capacity > capacityMax) {
        return false
      }
    }
    if (filter.title && entity.title !== filter.title) {
      return false
    }
    if (filter.sect && entity.sect !== filter.sect) {
      return false
    }
    if (filter.path && entity.path !== filter.path) {
      return false
    }
    if (filter.set) {
      return entity.sets.some((set) => set.startsWith(filter.set + ':'))
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
