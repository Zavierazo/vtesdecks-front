import { Injectable } from '@angular/core'
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita'
import { ApiLibrary } from './../../models/api-library'

export interface LibraryState extends EntityState<ApiLibrary> {
  locale?: string
  lastUpdate?: Date
}

const initialState: LibraryState = {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({
  name: LibraryStore.storeName,
})
export class LibraryStore extends EntityStore<LibraryState, ApiLibrary> {
  static readonly storeName = 'library_v1'

  constructor() {
    super(initialState)
  }

  updateLastUpdate(locale: string, lastUpdate: Date) {
    this.update((state) => ({
      ...state,
      locale,
      lastUpdate,
    }))
  }
}
