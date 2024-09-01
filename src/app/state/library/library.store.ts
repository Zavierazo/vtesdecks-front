import { ApiLibrary } from './../../models/api-library';
import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';

export interface LibraryState extends EntityState<ApiLibrary> {
  lastUpdate?: Date;
}

const initialState: LibraryState = {};

@Injectable({
  providedIn: 'root',
})
@StoreConfig({
  name: LibraryStore.storeName,
})
export class LibraryStore extends EntityStore<LibraryState, ApiLibrary> {
  static readonly storeName = 'library_v1';

  constructor() {
    super(initialState);
  }

  updateLastUpdate(lastUpdate: Date) {
    this.update((state) => ({
      ...state,
      lastUpdate,
    }));
  }
}
