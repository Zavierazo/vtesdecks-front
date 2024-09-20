import { Injectable } from '@angular/core'
import { QueryEntity } from '@datorama/akita'
import { Observable, map } from 'rxjs'
import { ApiCard } from '../../models/api-card'
import { ApiCrypt } from './../../models/api-crypt'
import { ApiDisciplineStat } from './../../models/api-discipline-stat'
import { CryptState, CryptStore } from './crypt.store'
@Injectable({
  providedIn: 'root',
})
export class CryptQuery extends QueryEntity<CryptState, ApiCrypt> {
  constructor(protected override store: CryptStore) {
    super(store)
  }

  selectByName(name: string, limit: number = 5): Observable<ApiCrypt[]> {
    return this.selectAll({
      limitTo: limit,
      filterBy: (entity) =>
        entity.name.toLowerCase().includes(name.toLowerCase()) ||
        entity.i18n?.name?.toLowerCase().includes(name.toLowerCase()),
    })
  }

  selectTitles(): Observable<string[]> {
    return this.selectAll().pipe(
      map((crypt) =>
        crypt.filter((crypt) => crypt.title).map((crypt) => crypt.title),
      ),
      map((titles) => [...new Set(titles)].sort()),
    )
  }

  selectSects(): Observable<string[]> {
    return this.selectAll().pipe(
      map((crypt) =>
        crypt.filter((crypt) => crypt.sect).map((crypt) => crypt.sect),
      ),
      map((sects) => [...new Set(sects)].sort()),
    )
  }

  selectTaints(): Observable<string[]> {
    return this.selectAll().pipe(
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
    return this.getAll().reduce(
      (max, crypt) => Math.max(max, crypt.capacity),
      11,
    )
  }

  getMaxGroup(): number {
    return this.getAll().reduce((max, crypt) => Math.max(max, crypt.group), 7)
  }

  getTaints(): string[] {
    return [
      ...new Set(
        this.getAll()
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
      const crypt = this.getEntity(card.id)
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
}
