import { Injectable, signal, inject } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { map, Observable } from 'rxjs'
import { ApiClanStat } from '../../models/api-clan-stat'
import { ApiCrypt, CryptSortBy } from '../../models/api-crypt'
import { ApiDisciplineStat } from '../../models/api-discipline-stat'
import { LocalStorageService } from '../../services/local-storage.service'

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
        if (filterFn) {
          entities = entities.filter(filterFn)
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
    filterFn?: (entity: ApiCrypt) => boolean,
    sortBy?: CryptSortBy,
    sortByOrder?: 'asc' | 'desc',
  ): ApiCrypt[] {
    let entities = this.entities()
    if (filterFn) {
      entities = entities.filter(filterFn)
    }
    if (sortBy && sortBy !== 'relevance') {
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

  private sort(a: any, b: any, order?: 'asc' | 'desc'): number {
    if (a === b) {
      return 0
    }
    if (order === 'asc') {
      return a > b ? 1 : -1
    } else {
      return a < b ? 1 : -1
    }
  }
}
