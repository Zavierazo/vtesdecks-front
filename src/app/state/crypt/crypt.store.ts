import { Injectable } from '@angular/core'
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita'
import { ApiCrypt } from './../../models/api-crypt'

export interface CryptState extends EntityState<ApiCrypt> {
  locale?: string
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

  updateLastUpdate(locale: string, lastUpdate: Date) {
    this.update((state) => ({
      ...state,
      locale,
      lastUpdate,
    }))
  }
}
