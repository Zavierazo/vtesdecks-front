import { EMPTY, Observable, tap } from 'rxjs';
import { ApiDecks } from './../../models/api-decks';
import { ApiDataService } from './../../services/api.data.service';
import { DecksState, DecksStore } from './decks.store';
import { Injectable } from '@angular/core';
import { transaction } from '@datorama/akita';
import { Params } from '@angular/router';
@Injectable({
  providedIn: 'root',
})
export class DecksService {
  static readonly initLimit = 20;
  static readonly limit = 10;

  constructor(
    private decksStore: DecksStore,
    private apiDataService: ApiDataService
  ) {}

  init(params: Params) {
    this.decksStore.remove();
    this.decksStore.updatePage(true, 0);
    this.decksStore.updateParams(params);
  }

  getMore(): Observable<ApiDecks> {
    const deckState: DecksState = this.decksStore.getValue();
    if (deckState.hasMore) {
      this.decksStore.setLoading(true);
      const limit =
        deckState.offset === 0 ? DecksService.initLimit : DecksService.limit;
      return this.apiDataService
        .getDecks(deckState.offset, limit, deckState.params)
        .pipe(tap((decks) => this.updateDecks(decks, limit)));
    }
    return EMPTY;
  }

  @transaction()
  private updateDecks(response: ApiDecks, limit: number) {
    const nextOffset = response.offset + limit;
    this.decksStore.add(response.decks);
    this.decksStore.updateTotal(response.total);
    this.decksStore.updatePage(response.total > nextOffset, nextOffset);
    this.decksStore.setLoading(false);
  }
}
