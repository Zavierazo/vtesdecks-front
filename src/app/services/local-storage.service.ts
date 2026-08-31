import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  /**
   * Keys of the card catalogs, which now live in IndexedDB. Cleaned up at
   * startup to free the quota they used to take.
   * TODO: remove in a future release, once clients have been updated.
   */
  private static readonly deprecatedKeys = [
    'AkitaStores',
    'crypt_v1_entities',
    'crypt_v1_state',
    'library_v1_entities',
    'library_v1_state',
    'set_v1_entities',
  ]

  constructor() {
    LocalStorageService.deprecatedKeys.forEach((key) => this.clearValue(key))
  }

  getValue<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    if (!item) {
      return null
    }

    try {
      return JSON.parse(item)
    } catch (e) {
      console.trace(e)
      return null
    }
  }

  setValue<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.trace(e)
    }
  }

  clearValue(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.trace(e)
    }
  }

  clearAll(): void {
    try {
      localStorage.clear()
    } catch (e) {
      console.trace(e)
    }
  }
}
