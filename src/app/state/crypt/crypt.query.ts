import { Injectable, inject } from '@angular/core'
import {
  ApiCard,
  ApiClanStat,
  ApiCrypt,
  ApiDisciplineStat,
  ApiSet,
  CryptFilter,
  CryptSortBy,
} from '@models'
import { SetQuery } from '@state/set/set.query'
import { getSetAbbrev } from '@utils'
import { Observable, map, switchMap } from 'rxjs'
import { CryptStats, CryptStore } from './crypt.store'
@Injectable({
  providedIn: 'root',
})
export class CryptQuery {
  private readonly store = inject(CryptStore)
  private readonly setQuery = inject(SetQuery)

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
  }: {
    limitTo?: number
    filter?: CryptFilter
    sortBy?: CryptSortBy
    sortByOrder?: 'asc' | 'desc'
    crypt?: CryptStats
  }): Observable<ApiCrypt[]> {
    return this.store.selectEntities(
      limitTo,
      filter,
      sortBy,
      sortByOrder,
      crypt,
    )
  }

  selectByName(name: string, limit = 5): Observable<ApiCrypt[]> {
    return this.store.selectEntities(limit, {
      name,
    })
  }

  selectTitles(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((crypt) =>
        crypt
          .filter((crypt: ApiCrypt) => crypt.title !== undefined)
          .map((crypt) => crypt.title!),
      ),
      map((titles) => [...new Set(titles)].sort()),
    )
  }

  selectSects(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((crypt) =>
        crypt.filter((crypt) => crypt.sect).map((crypt) => crypt.sect),
      ),
      map((sects) => [...new Set(sects)].sort()),
    )
  }

  selectTaints(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((crypt) =>
        crypt
          .filter((crypt) => crypt.taints)
          .map((crypt) => crypt.taints)
          .flat(),
      ),
      map((taints) => [...new Set(taints)].sort()),
    )
  }

  selectSets(): Observable<ApiSet[]> {
    return this.store.selectAll().pipe(
      map((library) =>
        library
          .filter((library) => library.sets)
          .map((library) => library.sets)
          .flat(),
      ),
      map((sets) => [...new Set(sets)].map(getSetAbbrev)),
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
    return this.store
      .getEntities()
      .reduce((max, crypt) => Math.max(max, crypt.capacity), 11)
  }

  getMaxGroup(): number {
    return this.store
      .getEntities()
      .reduce((max, crypt) => Math.max(max, crypt.group), 7)
  }

  getTaints(): string[] {
    return [
      ...new Set(
        this.store
          .getEntities()
          .filter((crypt) => crypt.taints)
          .map((crypt) => crypt.taints)
          .flat()
          .sort(),
      ),
    ]
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
      disciplines: [],
      superiorDisciplines: [],
      groupSlider: [1, this.getMaxGroup()],
      capacitySlider: [1, this.getMaxCapacity()],
      title: '',
      sect: '',
      path: '',
      set: '',
      taints: [],
      cardText: '',
      artist: '',
    }
  }
}
