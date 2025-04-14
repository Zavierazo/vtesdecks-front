import { Injectable } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  constructor() {
    this.clearValue('AkitaStores')
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
