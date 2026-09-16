import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCrypt } from '@models'
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
import { CryptStore } from './crypt.store'

@Injectable({ providedIn: 'root' })
export class CryptService {
  private readonly store = inject(CryptStore)
  private readonly api = inject(ApiDataService)
  private readonly language = inject(TranslocoService)
  private readonly connection = inject(ConnectivityService)
  private refresh?: Promise<ApiCrypt[]>
  static readonly limit = 10

  constructor() {
    this.connection.resumed.subscribe(() => this.getCryptCards().subscribe())
  }

  getCryptCards(): Observable<ApiCrypt[]> {
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

  private async update(): Promise<ApiCrypt[]> {
    if (this.refresh) {
      await this.refresh
      if (this.store.getValue().locale === this.language.getActiveLang()) {
        return this.store.getEntities()
      }
    }
    const locale = this.language.getActiveLang()
    this.refresh = (async () => {
      const metadata = await firstValueFrom(this.api.getCryptLastUpdate())
      if (
        this.store.storageError() ||
        !this.store.getEntities().length ||
        this.store.getValue().locale !== locale ||
        String(metadata.lastUpdate) !== String(this.store.getLastUpdate())
      ) {
        const cards = await firstValueFrom(this.api.getAllCrypt())
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
