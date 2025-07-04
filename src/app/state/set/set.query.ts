import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiSet, SetSortBy } from '../../models/api-set'
import { SetStore } from './set.store'
@Injectable({
  providedIn: 'root',
})
export class SetQuery {
  private readonly store = inject(SetStore)

  selectEntity(id: number): Observable<ApiSet | undefined> {
    return this.store.selectEntity(id)
  }

  selectEntityByAbbrev(abbrev: string): Observable<ApiSet | undefined> {
    return this.store.selectEntityByAbbrev(abbrev)
  }

  hasEntity(id: number): boolean {
    return this.store.getEntity(id) !== undefined
  }

  hasEntityByAbbrev(abbrev: string): boolean {
    return this.store.getEntityByAbbrev(abbrev) !== undefined
  }

  getEntity(id: number): ApiSet | undefined {
    return this.store.getEntity(id)
  }

  getAll({
    filterBy,
    sortBy,
    sortByOrder,
  }: {
    filterBy?: (entity: ApiSet) => boolean
    sortBy?: SetSortBy
    sortByOrder?: 'asc' | 'desc'
  }): ApiSet[] {
    return this.store.getEntities(filterBy, sortBy, sortByOrder)
  }

  selectAll({
    limitTo,
    filterBy,
    sortBy,
    sortByOrder,
  }: {
    limitTo?: number
    filterBy?: (entity: ApiSet) => boolean
    sortBy?: SetSortBy
    sortByOrder?: 'asc' | 'desc'
  }): Observable<ApiSet[]> {
    return this.store.selectEntities(limitTo, filterBy, sortBy, sortByOrder)
  }

  getLastUpdate(): Date {
    return this.store.getEntities(undefined, 'lastUpdate', 'desc')[0]
      ?.lastUpdate
  }
}
