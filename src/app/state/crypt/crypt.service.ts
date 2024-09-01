import { CryptQuery } from './crypt.query';
import { ApiDataService } from './../../services/api.data.service';
import { Injectable } from '@angular/core';
import { CryptState, CryptStore } from './crypt.store';
import {
  tap,
  switchMap,
  Observable,
  EMPTY,
  filter,
  map,
  defaultIfEmpty,
} from 'rxjs';
import { ApiCrypt } from '../../models/api-crypt';
@Injectable({
  providedIn: 'root',
})
export class CryptService {
  static readonly limit = 10;

  constructor(
    private cryptQuery: CryptQuery,
    private cryptStore: CryptStore,
    private apiDataService: ApiDataService
  ) {}

  getCryptCards(): Observable<ApiCrypt[]> {
    const cryptState: CryptState = this.cryptStore.getValue();
    const request$ = this.apiDataService
      .getAllCrypt()
      .pipe(tap((cards: ApiCrypt[]) => this.cryptStore.set(cards)));
    return this.apiDataService.getCryptLastUpdate().pipe(
      map((crypt) => crypt.lastUpdate),
      filter((lastUpdate) => lastUpdate !== cryptState.lastUpdate),
      switchMap((lastUpdate) =>
        request$.pipe(tap(() => this.cryptStore.updateLastUpdate(lastUpdate)))
      ),
      defaultIfEmpty([])
    );
  }

  getCrypt(id: number): Observable<ApiCrypt | undefined> {
    if (this.cryptQuery.hasEntity(id) || id < 200000 || id > 300000) {
      return EMPTY;
    }
    if (this.cryptQuery.hasEntity(id)) {
      return this.cryptQuery.selectEntity(id);
    } else {
      return this.apiDataService
        .getCrypt(id)
        .pipe(tap((card: ApiCrypt) => this.cryptStore.upsert(id, card)));
    }
  }
}
