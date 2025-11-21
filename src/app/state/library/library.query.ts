import { inject, Injectable } from '@angular/core'
import { map, Observable } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { searchIncludes } from '../../utils/vtes-utils'
import { ApiClanStat } from './../../models/api-clan-stat'
import { ApiDisciplineStat } from './../../models/api-discipline-stat'
import { ApiLibrary, LibrarySortBy } from './../../models/api-library'
import { LibraryStats, LibraryStore } from './library.store'
@Injectable({
  providedIn: 'root',
})
export class LibraryQuery {
  private readonly store = inject(LibraryStore)

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
    filterBy,
    sortBy,
    sortByOrder,
    nameFilter,
  }: {
    filterBy?: (entity: ApiLibrary) => boolean
    sortBy?: LibrarySortBy
    sortByOrder?: 'asc' | 'desc'
    nameFilter?: string
  }): ApiLibrary[] {
    return this.store.getEntities(filterBy, sortBy, sortByOrder, nameFilter)
  }

  selectAll({
    limitTo,
    filterBy,
    sortBy,
    sortByOrder,
    nameFilter,
    stats,
  }: {
    limitTo?: number
    filterBy?: (entity: ApiLibrary) => boolean
    sortBy?: LibrarySortBy
    sortByOrder?: 'asc' | 'desc'
    nameFilter?: string
    stats?: LibraryStats
  }): Observable<ApiLibrary[]> {
    return this.store.selectEntities(
      limitTo,
      filterBy,
      sortBy,
      sortByOrder,
      nameFilter,
      stats,
    )
  }

  selectByName(name: string, limit = 5): Observable<ApiLibrary[]> {
    return this.store.selectEntities(
      limit,
      (entity) =>
        searchIncludes(entity.name, name) ||
        searchIncludes(entity.i18n?.name, name) ||
        false,
    )
  }

  selectSects(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((library) =>
        library
          .filter((library) => library.sects)
          .map((library) => library.sects)
          .flat(),
      ),
      map((sects) => [...new Set(sects)].sort()),
    )
  }

  selectTitles(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((library) =>
        library
          .filter((library) => library.titles)
          .map((library) => library.titles)
          .flat(),
      ),
      map((titles) => [...new Set(titles)].sort()),
    )
  }

  selectTaints(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((library) =>
        library
          .filter((library) => library.taints)
          .map((library) => library.taints)
          .flat(),
      ),
      map((taints) => [...new Set(taints)].sort()),
    )
  }

  getTaints(): string[] {
    return [
      ...new Set(
        this.store
          .getEntities()
          .filter((library) => library.taints)
          .map((library) => library.taints)
          .flat()
          .sort(),
      ),
    ]
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
}
