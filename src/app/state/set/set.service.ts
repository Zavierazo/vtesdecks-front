import { inject, Injectable } from '@angular/core'
import { defaultIfEmpty, filter, map, Observable, switchMap, tap } from 'rxjs'
import { ApiSet } from '../../models/api-set'
import { ApiDataService } from '../../services/api.data.service'
import { SetQuery } from './set.query'
import { SetStore } from './set.store'
@Injectable({ providedIn: 'root' })
export class SetService {
  private readonly setQuery = inject(SetQuery)
  private readonly setStore = inject(SetStore)
  private readonly apiDataService = inject(ApiDataService)

  static readonly limit = 10

  getSets(): Observable<ApiSet[]> {
    const request$ = this.apiDataService
      .getSets()
      .pipe(tap((sets: ApiSet[]) => this.setStore.set(sets)))
    return this.apiDataService.getSetLastUpdate().pipe(
      map((sets) => sets.lastUpdate),
      filter((lastUpdate) => lastUpdate !== this.setQuery.getLastUpdate()),
      switchMap(() => request$),
      defaultIfEmpty([]),
    )
  }

  getSet(abbrev: string): Observable<ApiSet | undefined> {
    if (this.setQuery.hasEntityByAbbrev(abbrev)) {
      return this.setQuery.selectEntityByAbbrev(abbrev)
    } else {
      return this.apiDataService
        .getSet(abbrev)
        .pipe(tap((card: ApiSet) => this.setStore.upsert(card.id, card)))
    }
  }
}
