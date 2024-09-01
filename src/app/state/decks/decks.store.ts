import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { ApiDeck } from '../../models/api-deck';

export interface DecksState extends EntityState<ApiDeck> {
  params: Params;
  hasMore: boolean;
  offset: number;
  total: number;
}

const initialState: DecksState = {
  params: {},
  hasMore: true,
  offset: 0,
  total: 0,
};

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: DecksStore.storeName })
export class DecksStore extends EntityStore<DecksState, ApiDeck> {
  static readonly storeName = 'decks';

  constructor() {
    super(initialState);
  }

  updatePage(hasMore: boolean, offset: number) {
    this.update((state) => ({
      ...state,
      hasMore,
      offset,
    }));
  }

  updateParams(params: Params) {
    this.update((state) => ({
      ...state,
      params,
    }));
  }

  updateTotal(total: number) {
    this.update((state) => ({
      ...state,
      total,
    }));
  }
}
