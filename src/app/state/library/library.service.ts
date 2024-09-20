import { Injectable } from '@angular/core'
import { TranslocoService } from '@ngneat/transloco'
import {
  defaultIfEmpty,
  EMPTY,
  filter,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs'
import { ApiDataService } from '../../services/api.data.service'
import { ApiLibrary } from './../../models/api-library'
import { LibraryQuery } from './library.query'
import { LibraryState, LibraryStore } from './library.store'
@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  static readonly limit = 10

  constructor(
    private libraryQuery: LibraryQuery,
    private libraryStore: LibraryStore,
    private apiDataService: ApiDataService,
    private translocoService: TranslocoService,
  ) {}

  getLibraryCards(): Observable<ApiLibrary[]> {
    const locale = this.translocoService.getActiveLang()
    const libraryState: LibraryState = this.libraryStore.getValue()
    const request$ = this.apiDataService
      .getAllLibrary()
      .pipe(tap((cards: ApiLibrary[]) => this.libraryStore.set(cards)))
    return this.apiDataService.getLibraryLastUpdate().pipe(
      map((library) => library.lastUpdate),
      filter(
        (lastUpdate) =>
          lastUpdate !== libraryState.lastUpdate ||
          locale !== libraryState.locale,
      ),
      switchMap((lastUpdate) =>
        request$.pipe(
          tap(() => this.libraryStore.updateLastUpdate(locale, lastUpdate)),
        ),
      ),
      defaultIfEmpty([]),
    )
  }

  getLibrary(id: number): Observable<ApiLibrary | undefined> {
    if (id < 100000 || id > 200000) {
      return EMPTY
    }
    if (this.libraryQuery.hasEntity(id)) {
      return this.libraryQuery.selectEntity(id)
    } else {
      return this.apiDataService
        .getLibrary(id)
        .pipe(tap((card: ApiLibrary) => this.libraryStore.upsert(id, card)))
    }
  }
}
