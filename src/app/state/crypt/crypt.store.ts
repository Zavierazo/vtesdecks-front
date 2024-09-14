import { ApiCrypt } from './../../models/api-crypt'
import { Injectable } from '@angular/core'
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita'

export interface CryptState extends EntityState<ApiCrypt> {
  lastUpdate?: Date
}

const initialState: CryptState = {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({
  name: CryptStore.storeName,
})
export class CryptStore extends EntityStore<CryptState, ApiCrypt> {
  static readonly storeName = 'crypt_v1'

  constructor() {
    super(initialState)
  }

  updateLastUpdate(lastUpdate: Date) {
    this.update((state) => ({
      ...state,
      lastUpdate,
    }))
  }
}
