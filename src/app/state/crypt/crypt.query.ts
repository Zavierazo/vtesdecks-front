import { Injectable } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { ApiCrypt } from './../../models/api-crypt'
import { ApiDisciplineStat } from './../../models/api-discipline-stat'
import { CryptStore } from './crypt.store'
@Injectable({
  providedIn: 'root',
})
export class CryptQuery {
  constructor(private readonly store: CryptStore) {}

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
    filterBy,
    sortBy,
    sortByOrder,
  }: {
    filterBy?: (entity: ApiCrypt) => boolean
    sortBy?: keyof ApiCrypt
    sortByOrder?: 'asc' | 'desc'
  }): ApiCrypt[] {
    return this.store.getEntities(filterBy, sortBy, sortByOrder)
  }

  selectAll({
    limitTo,
    filterBy,
    sortBy,
    sortByOrder,
  }: {
    limitTo?: number
    filterBy?: (entity: ApiCrypt) => boolean
    sortBy?: keyof ApiCrypt
    sortByOrder?: 'asc' | 'desc'
  }): Observable<ApiCrypt[]> {
    return this.store.selectEntities(limitTo, filterBy, sortBy, sortByOrder)
  }

  selectByName(name: string, limit: number = 5): Observable<ApiCrypt[]> {
    return this.store.selectEntities(
      limit,
      (entity) =>
        entity.name.toLowerCase().includes(name.toLowerCase()) ||
        entity.i18n?.name?.toLowerCase().includes(name.toLowerCase()),
    )
  }

  selectTitles(): Observable<string[]> {
    return this.store.selectAll().pipe(
      map((crypt) =>
        crypt.filter((crypt) => crypt.title).map((crypt) => crypt.title),
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

  getLastUpdate(): Date {
    return this.store.getEntities(undefined, 'lastUpdate', 'desc')[0]
      ?.lastUpdate
  }
}
