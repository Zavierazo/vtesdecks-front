import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiLibrary } from '@models'
import { ApiDataService } from '@services'
import {
  catchError,
  concat,
  defer,
  firstValueFrom,
  from,
  Observable,
  of,
  switchMap,
} from 'rxjs'
import { ConnectivityService } from '../../services/connectivity.service'
import { LibraryStore } from './library.store'

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly store = inject(LibraryStore)
  private readonly api = inject(ApiDataService)
  private readonly language = inject(TranslocoService)
  private readonly connection = inject(ConnectivityService)
  private refresh?: Promise<ApiLibrary[]>
  static readonly limit = 10

  constructor() {
    this.connection.resumed.subscribe(() => this.getLibraryCards().subscribe())
  }

  getLibraryCards(): Observable<ApiLibrary[]> {
    return defer(() => from(this.store.ready)).pipe(
      switchMap(() => {
        const local = this.store.getEntities()
        if (this.connection.offline()) {
          return of(local)
        }
        const refresh = defer(() => from(this.update())).pipe(
          catchError(() => of(this.store.getEntities())),
        )
        return local.length ? concat(of(local), refresh) : refresh
      }),
    )
  }

  private async update(): Promise<ApiLibrary[]> {
    if (this.refresh) {
      await this.refresh
      if (this.store.getValue().locale === this.language.getActiveLang()) {
        return this.store.getEntities()
      }
    }
    const locale = this.language.getActiveLang()
    this.refresh = (async () => {
      const metadata = await firstValueFrom(this.api.getLibraryLastUpdate())
      if (
        this.store.storageError() ||
        !this.store.getEntities().length ||
        this.store.getValue().locale !== locale ||
        String(metadata.lastUpdate) !== String(this.store.getLastUpdate())
      ) {
        const cards = await firstValueFrom(this.api.getAllLibrary())
        if (
          !Array.isArray(cards) ||
          !cards.length ||
          this.language.getActiveLang() !== locale
        ) {
          return this.store.getEntities()
        }
        await this.store.replaceCatalog(cards, locale, metadata.lastUpdate)
      }
      return this.store.getEntities()
    })()
    try {
      return await this.refresh
    } finally {
      this.refresh = undefined
    }
  }
}
