import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiSet } from '@models'
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
import { SetStore } from './set.store'
@Injectable({ providedIn: 'root' })
export class SetService {
  private readonly store = inject(SetStore)
  private readonly api = inject(ApiDataService)
  private readonly language = inject(TranslocoService)
  private readonly connection = inject(ConnectivityService)
  private refresh?: Promise<ApiSet[]>
  static readonly limit = 10
  constructor() {
    this.connection.resumed.subscribe(() => this.getSets().subscribe())
  }
  getSets(): Observable<ApiSet[]> {
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
  private async update(): Promise<ApiSet[]> {
    if (this.refresh) {
      return this.refresh
    }
    const locale = this.language.getActiveLang()
    this.refresh = (async () => {
      const metadata = await firstValueFrom(this.api.getSetLastUpdate())
      if (
        this.store.storageError() ||
        !this.store.getEntities().length ||
        this.store.metadata()?.locale !== locale ||
        String(metadata.lastUpdate) !==
          String(this.store.metadata()?.lastUpdate)
      ) {
        const sets = await firstValueFrom(this.api.getSets())
        if (sets.length && locale === this.language.getActiveLang()) {
          await this.store.replaceCatalog(sets, locale, metadata.lastUpdate)
        }
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
