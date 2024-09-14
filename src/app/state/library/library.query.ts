import { ApiDisciplineStat } from './../../models/api-discipline-stat'
import { ApiClanStat } from './../../models/api-clan-stat'
import { ApiLibrary } from './../../models/api-library'
import { map, Observable } from 'rxjs'
import { Injectable } from '@angular/core'
import { QueryEntity } from '@datorama/akita'
import { LibraryState, LibraryStore } from './library.store'
import { ApiCard } from '../../models/api-card'
@Injectable({
  providedIn: 'root',
})
export class LibraryQuery extends QueryEntity<LibraryState, ApiLibrary> {
  constructor(protected override store: LibraryStore) {
    super(store)
  }

  selectByName(name: string, limit: number = 5): Observable<ApiLibrary[]> {
    return this.selectAll({
      limitTo: limit,
      filterBy: (entity) =>
        entity.name.toLowerCase().includes(name.toLowerCase()),
    })
  }

  selectSects(): Observable<string[]> {
    return this.selectAll().pipe(
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
    return this.selectAll().pipe(
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
    return this.selectAll().pipe(
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
        this.getAll()
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
        const library = this.getEntity(card.id)
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
      const library = this.getEntity(card.id)
      if (library && library.clans && library.clans.length > 0) {
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
