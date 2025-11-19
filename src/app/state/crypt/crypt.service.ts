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
import { ApiCrypt } from '../../models/api-crypt'
import { ApiDataService } from './../../services/api.data.service'
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
      map((crypt) => crypt.lastUpdate),
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

  getCrypt(id: number): Observable<ApiCrypt | undefined> {
    if (this.cryptQuery.hasEntity(id) || id < 200000 || id > 300000) {
      return EMPTY
    }
    if (this.cryptQuery.hasEntity(id)) {
      return this.cryptQuery.selectEntity(id)
    } else {
      return this.apiDataService
        .getCrypt(id)
        .pipe(tap((card: ApiCrypt) => this.cryptStore.upsert(id, card)))
    }
  }
}
