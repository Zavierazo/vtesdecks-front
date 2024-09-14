import { ApiLibrary } from './../../models/api-library'
import { ApiDataService } from '../../services/api.data.service'
import { Injectable } from '@angular/core'
import { LibraryState, LibraryStore } from './library.store'
import {
  tap,
  switchMap,
  Observable,
  EMPTY,
  map,
  filter,
  defaultIfEmpty,
} from 'rxjs'
import { LibraryQuery } from './library.query'
@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  static readonly limit = 10

  constructor(
    private libraryQuery: LibraryQuery,
    private libraryStore: LibraryStore,
    private apiDataService: ApiDataService,
  ) {}

  getLibraryCards(): Observable<ApiLibrary[]> {
    const libraryState: LibraryState = this.libraryStore.getValue()
    const request$ = this.apiDataService
      .getAllLibrary()
      .pipe(tap((cards: ApiLibrary[]) => this.libraryStore.set(cards)))
    return this.apiDataService.getLibraryLastUpdate().pipe(
      map((library) => library.lastUpdate),
      filter((lastUpdate) => lastUpdate !== libraryState.lastUpdate),
      switchMap((lastUpdate) =>
        request$.pipe(
          tap(() => this.libraryStore.updateLastUpdate(lastUpdate)),
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
