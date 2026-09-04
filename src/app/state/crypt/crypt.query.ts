import { Injectable, computed, inject } from '@angular/core'
import {
  ApiCard,
  ApiClanStat,
  ApiCrypt,
  ApiDisciplineStat,
  ApiSet,
  CryptFilter,
  CryptSortBy,
} from '@models'
import { toObservable } from '@angular/core/rxjs-interop'
import { SetQuery } from '@state/set/set.query'
import { CRYPT_VOTES_RANGE, getSetAbbrev } from '@utils'
import { Observable, switchMap } from 'rxjs'
import { CryptStats, CryptStore } from './crypt.store'
@Injectable({
  providedIn: 'root',
})
export class CryptQuery {
  private readonly store = inject(CryptStore)
  private readonly setQuery = inject(SetQuery)

  private readonly titles = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((crypt) => crypt.title !== undefined)
          .map((crypt) => crypt.title!),
      ),
    ].sort(),
  )
  private readonly titles$ = toObservable(this.titles)
  private readonly sects = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((crypt) => crypt.sect)
          .map((crypt) => crypt.sect),
      ),
    ].sort(),
  )
  private readonly sects$ = toObservable(this.sects)
  private readonly taints = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((crypt) => crypt.taints)
          .flatMap((crypt) => crypt.taints),
      ),
    ].sort(),
  )
  private readonly taints$ = toObservable(this.taints)
  private readonly setAbbrevs = computed(() =>
    [
      ...new Set(
        this.store
          .entitiesSignal()
          .filter((crypt) => crypt.sets)
          .flatMap((crypt) => crypt.sets),
      ),
    ].map(getSetAbbrev),
  )
  private readonly setAbbrevs$ = toObservable(this.setAbbrevs)
  private readonly maxCapacity = computed(() =>
    this.store
      .entitiesSignal()
      .reduce((max, crypt) => Math.max(max, crypt.capacity), 11),
  )
  private readonly maxGroup = computed(() =>
    this.store
      .entitiesSignal()
      .reduce((max, crypt) => Math.max(max, crypt.group), 7),
  )

  selectEntity(id: number): Observable<ApiCrypt | undefined> {
    return this.store.selectEntity(id)
  }

  hasEntity(id: number): boolean {
    return this.store.getEntity(id) !== undefined
  }

  getEntity(id: number): ApiCrypt | undefined {
    return this.store.getEntity(id)
  }

  getAll({
    filter,
    sortBy,
    sortByOrder,
  }: {
    filter?: CryptFilter
    sortBy?: CryptSortBy
    sortByOrder?: 'asc' | 'desc'
  }): ApiCrypt[] {
    return this.store.getEntities(filter, sortBy, sortByOrder)
  }

  selectAll({
    limitTo,
    filter,
    sortBy,
    sortByOrder,
    crypt,
    priorityIds,
  }: {
    limitTo?: number
    filter?: CryptFilter
    sortBy?: CryptSortBy
    sortByOrder?: 'asc' | 'desc'
    crypt?: CryptStats
    priorityIds?: number[]
  }): Observable<ApiCrypt[]> {
    return this.store.selectEntities(
      limitTo,
      filter,
      sortBy,
      sortByOrder,
      crypt,
      priorityIds,
    )
  }

  selectByName(name: string, limit = 5): Observable<ApiCrypt[]> {
    return this.store.selectEntities(limit, {
      name,
    })
  }

  selectTitles(): Observable<string[]> {
    return this.titles$
  }

  selectSects(): Observable<string[]> {
    return this.sects$
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

  getMaxCapacity(): number {
    return this.maxCapacity()
  }

  getMaxGroup(): number {
    return this.maxGroup()
  }

  getTaints(): string[] {
    return this.taints()
  }

  getClans(cards: ApiCard[]): ApiClanStat[] {
    const clans: ApiClanStat[] = []
    cards.forEach((card) => {
      const crypt = this.store.getEntity(card.id)
      if (crypt) {
        const clan = clans.find((c) => c.clans[0] === crypt.clan)
        if (clan) {
          clan.number++
        } else {
          clans.push({
            clans: [crypt.clan],
            number: 1,
          })
        }
      }
    })
    clans.sort((a, b) => b.number - a.number)
    return clans
  }

  getSects(cards: ApiCard[]): string[] {
    const sects: string[] = []
    cards.forEach((card) => {
      const crypt = this.store.getEntity(card.id)
      if (crypt?.sect) {
        const sect = sects.find((sect) => sect === crypt.sect)
        if (!sect) {
          sects.push(crypt.sect)
        }
      }
    })
    return sects
  }

  getDisciplines(cards: ApiCard[]): ApiDisciplineStat[] {
    const disciplines: ApiDisciplineStat[] = []
    cards.forEach((card) => {
      const crypt = this.store.getEntity(card.id)
      if (crypt) {
        crypt.superiorDisciplines?.forEach((superiorDiscipline) => {
          const discipline = disciplines.find(
            (d) => d.disciplines[0] === superiorDiscipline,
          )
          if (discipline) {
            discipline.superior++
          } else {
            disciplines.push({
              disciplines: [superiorDiscipline],
              inferior: 0,
              superior: 1,
            })
          }
        })
        crypt.disciplines
          ?.filter(
            (discipline) =>
              !crypt.superiorDisciplines?.some(
                (superiorDiscipline) => superiorDiscipline === discipline,
              ),
          )
          .forEach((inferiorDiscipline) => {
            const discipline = disciplines.find(
              (d) => d.disciplines[0] === inferiorDiscipline,
            )
            if (discipline) {
              discipline.inferior++
            } else {
              disciplines.push({
                disciplines: [inferiorDiscipline],
                inferior: 1,
                superior: 0,
              })
            }
          })
      }
    })
    disciplines.sort((a, b) => b.superior - a.superior)
    return disciplines
  }

  getDefaultCryptFilter(): CryptFilter {
    return {
      name: '',
      clans: [],
      notClans: [],
      disciplines: [],
      superiorDisciplines: [],
      notDisciplines: [],
      disciplineMode: 'and',
      groupSlider: [1, this.getMaxGroup()],
      advanced: undefined,
      capacitySlider: [1, this.getMaxCapacity()],
      votesSlider: [...CRYPT_VOTES_RANGE],
      title: '',
      sect: '',
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
