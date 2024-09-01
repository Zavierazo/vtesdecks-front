import { Injectable } from '@angular/core';
import { EntityState, Store, StoreConfig } from '@datorama/akita';
import { ApiDeck } from '../../models/api-deck';

export interface DeckState extends EntityState<ApiDeck> {
  deck?: ApiDeck;
}

const initialState: DeckState = {};

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: DeckStore.storeName })
export class DeckStore extends Store<DeckState> {
  static readonly storeName = 'deck';

  constructor() {
    super(initialState);
  }
}
