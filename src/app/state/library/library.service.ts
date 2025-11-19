import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
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
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly libraryStore = inject(LibraryStore)
  private readonly apiDataService = inject(ApiDataService)
  private readonly translocoService = inject(TranslocoService)

  static readonly limit = 10

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
          lastUpdate !== this.libraryStore.getLastUpdate() ||
          locale !== libraryState.locale ||
          this.libraryQuery.getAll({}).length < 1000,
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
