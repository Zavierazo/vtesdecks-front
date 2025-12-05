import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCrypt } from '@models'
import { ApiDataService } from '@services'
import { defaultIfEmpty, filter, map, Observable, switchMap, tap } from 'rxjs'
import { CryptQuery } from './crypt.query'
import { CryptState, CryptStore } from './crypt.store'
@Injectable({ providedIn: 'root' })
export class CryptService {
  private cryptQuery = inject(CryptQuery)
  private cryptStore = inject(CryptStore)
  private apiDataService = inject(ApiDataService)
  private translocoService = inject(TranslocoService)

  static readonly limit = 10

  getCryptCards(): Observable<ApiCrypt[]> {
    const locale = this.translocoService.getActiveLang()
    const cryptState: CryptState = this.cryptStore.getValue()
    const request$ = this.apiDataService
      .getAllCrypt()
      .pipe(tap((cards: ApiCrypt[]) => this.cryptStore.set(cards)))
    return this.apiDataService.getCryptLastUpdate().pipe(
      map((crypt) => crypt?.lastUpdate),
      filter(
        (lastUpdate) =>
          lastUpdate !== this.cryptStore.getLastUpdate() ||
          locale !== cryptState.locale ||
          this.cryptQuery.getAll({}).length < 1000,
      ),
      switchMap((lastUpdate) =>
        request$.pipe(
          tap(() => this.cryptStore.updateLastUpdate(locale, lastUpdate)),
        ),
      ),
      defaultIfEmpty([]),
    )
  }
}
