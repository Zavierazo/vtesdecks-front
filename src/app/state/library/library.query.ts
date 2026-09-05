import { computed, inject, Injectable } from '@angular/core'
import {
  ApiCard,
  ApiClanStat,
  ApiDisciplineStat,
  ApiLibrary,
  ApiSet,
  LibraryFilter,
  LibrarySortBy,
} from '@models'
import { toObservable } from '@angular/core/rxjs-interop'
import { SetQuery } from '@state/set/set.query'
import { getSetAbbrev } from '@utils'
import { Observable, switchMap } from 'rxjs'
import { LibraryStats, LibraryStore } from './library.store'
@Injectable({
  providedIn: 'root',
})
export class LibraryQuery {
  private readonly store = inject(LibraryStore)
  private readonly setQuery = inject(SetQuery)

  private readonly titles = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((library) => library.titles)
          .flatMap((library) => library.titles),
      ),
    ].sort(),
  )
  private readonly titles$ = toObservable(this.titles)
  private readonly sects = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((library) => library.sects)
          .flatMap((library) => library.sects),
      ),
    ].sort(),
  )
  private readonly sects$ = toObservable(this.sects)
  private readonly taints = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((library) => library.taints)
          .flatMap((library) => library.taints),
      ),
    ].sort(),
  )
  private readonly taints$ = toObservable(this.taints)
  private readonly setAbbrevs = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((library) => library.sets)
          .flatMap((library) => library.sets),
      ),
    ].map(getSetAbbrev),
  )
  private readonly setAbbrevs$ = toObservable(this.setAbbrevs)
  private readonly maxConvictionCost = computed(() =>
    this.store
      .entitiesSignal()
      .reduce((max, library) => Math.max(max, library.convictionCost ?? 0), 4),
  )

  selectEntity(id: number): Observable<ApiLibrary | undefined> {
    return this.store.selectEntity(id)
  }

  hasEntity(id: number): boolean {
    return this.store.getEntity(id) !== undefined
  }

  getEntity(id: number): ApiLibrary | undefined {
    return this.store.getEntity(id)
  }

  getAll({
    filter,
    sortBy,
    sortByOrder,
  }: {
    filter?: LibraryFilter
    sortBy?: LibrarySortBy
    sortByOrder?: 'asc' | 'desc'
  }): ApiLibrary[] {
    return this.store.getEntities(filter, sortBy, sortByOrder)
  }

  selectAll({
    limitTo,
    filter,
    sortBy,
    sortByOrder,
    stats,
    priorityIds,
  }: {
    limitTo?: number
    filter?: LibraryFilter
    sortBy?: LibrarySortBy
    sortByOrder?: 'asc' | 'desc'
    stats?: LibraryStats
    priorityIds?: number[]
  }): Observable<ApiLibrary[]> {
    return this.store.selectEntities(
      limitTo,
      filter,
      sortBy,
      sortByOrder,
      stats,
      priorityIds,
    )
  }

  selectByName(name: string, limit = 5): Observable<ApiLibrary[]> {
    return this.store.selectEntities(limit, {
      name,
    })
  }

  selectSects(): Observable<string[]> {
    return this.sects$
  }

  selectTitles(): Observable<string[]> {
    return this.titles$
  }

  selectTaints(): Observable<string[]> {
    return this.taints$
  }

  selectSets(): Observable<ApiSet[]> {
    return this.setAbbrevs$.pipe(
      switchMap((setIds) =>
        this.setQuery.selectAll({
          filterBy: (set) => setIds.includes(set.abbrev),
          sortBy: 'releaseDate',
          sortByOrder: 'desc',
        }),
      ),
    )
  }

  getTaints(): string[] {
    return this.taints()
  }

  getDisciplines(cards: ApiCard[]): ApiDisciplineStat[] {
    const disciplines: ApiDisciplineStat[] = []
    cards
      .filter((card) => card.type !== 'Master' && card.type !== 'Event')
      .forEach((card) => {
        const library = this.store.getEntity(card.id)
        if (library) {
          const discipline = disciplines.find(
            (disc) =>
              disc.disciplines.length === library.disciplines.length &&
              disc.disciplines.every((d) => library.disciplines.includes(d)),
          )
          if (discipline) {
            discipline.inferior += card.number
          } else {
            disciplines.push({
              disciplines: library.disciplines,
              superior: 0,
              inferior: card.number,
            })
          }
        }
      })
    disciplines.sort((a, b) => b.inferior - a.inferior)
    return disciplines
  }

  getClans(cards: ApiCard[]): ApiClanStat[] {
    const clans: ApiClanStat[] = []
    cards.forEach((card) => {
      const library = this.store.getEntity(card.id)
      if (library?.clans && library.clans.length > 0) {
        const clan = clans.find(
          (entity) =>
            entity.clans.length === library.clans.length &&
            entity.clans.every((d) => library.clans.includes(d)),
        )
        if (clan) {
          clan.number += card.number
        } else {
          clans.push({
            clans: library.clans,
            number: card.number,
          })
        }
      }
    })
    clans.sort((a, b) => b.number - a.number)
    return clans
  }

  getMaxConvictionCost(): number {
    return this.maxConvictionCost()
  }

  getDefaultLibraryFilter(): LibraryFilter {
    return {
      name: '',
      types: [],
      notTypes: [],
      typeMode: 'or',
      clans: [],
      notClans: [],
      disciplines: [],
      notDisciplines: [],
      disciplineMode: 'and',
      bloodCostSlider: [0, 4],
      poolCostSlider: [0, 6],
      convictionCostSlider: [0, this.getMaxConvictionCost()],
      trifle: undefined,
      titles: [],
      sects: [],
      paths: [],
      notPaths: [],
      sets: [],
      notSets: [],
      taints: [],
      cardText: '',
      artist: '',
    }
  }
}
