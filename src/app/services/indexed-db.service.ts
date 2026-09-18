import { Injectable } from '@angular/core'

export type IndexedDbStore = 'crypt' | 'library' | 'set' | 'images'

const DB_NAME = 'vtesdecks'
const DB_VERSION = 2
const META_STORE = 'meta'
const ENTITY_STORES: IndexedDbStore[] = ['crypt', 'library', 'set', 'images']

/**
 * Thin IndexedDB wrapper used to persist the card catalogs (crypt, library and
 * sets), which are too big for localStorage. Legacy reads/writes degrade to
 * memory-only operation when storage is unavailable. Offline preparation uses
 * strict replaceCatalog/write/clear operations so failures remain visible.
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDbService {
  private db?: Promise<IDBDatabase | null>

  get supported(): boolean {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  }

  async getAll<T>(store: IndexedDbStore): Promise<T[]> {
    const db = await this.open()
    if (!db) {
      return []
    }
    try {
      return await this.request<T[]>(
        db.transaction(store, 'readonly').objectStore(store).getAll(),
      )
    } catch (e) {
      console.trace(e)
      return []
    }
  }

  async putAll<T>(store: IndexedDbStore, entities: T[]): Promise<void> {
    const db = await this.open()
    if (!db) {
      return
    }
    try {
      const transaction = db.transaction(store, 'readwrite')
      const objectStore = transaction.objectStore(store)
      objectStore.clear()
      entities.forEach((entity) => objectStore.put(entity))
      await this.complete(transaction)
    } catch (e) {
      console.trace(e)
    }
  }

  async put<T>(store: IndexedDbStore, entity: T): Promise<void> {
    const db = await this.open()
    if (!db) {
      return
    }
    try {
      const transaction = db.transaction(store, 'readwrite')
      transaction.objectStore(store).put(entity)
      await this.complete(transaction)
    } catch (e) {
      console.trace(e)
    }
  }

  async getMeta<T>(key: string): Promise<T | null> {
    const db = await this.open()
    if (!db) {
      return null
    }
    try {
      const value = await this.request<T | undefined>(
        db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(key),
      )
      return value ?? null
    } catch (e) {
      console.trace(e)
      return null
    }
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    const db = await this.open()
    if (!db) {
      return
    }
    try {
      const transaction = db.transaction(META_STORE, 'readwrite')
      transaction.objectStore(META_STORE).put(value, key)
      await this.complete(transaction)
    } catch (e) {
      console.trace(e)
    }
  }

  async replaceCatalog<T>(
    store: IndexedDbStore,
    entities: T[],
    key: string,
    metadata: unknown,
  ): Promise<void> {
    const db = await this.open()
    if (!db) {
      throw new Error('Storage unavailable')
    }
    const tx = db.transaction([store, META_STORE], 'readwrite')
    const done = this.complete(tx)
    try {
      tx.objectStore(store).clear()
      entities.forEach((entity) => tx.objectStore(store).put(entity))
      tx.objectStore(META_STORE).put(metadata, key)
    } catch (error) {
      tx.abort()
      await done.catch(() => undefined)
      throw error
    }
    await done
  }

  async write<T>(store: IndexedDbStore, value: T): Promise<void> {
    const db = await this.open()
    if (!db) {
      throw new Error('Storage unavailable')
    }
    const tx = db.transaction(store, 'readwrite')
    const done = this.complete(tx)
    tx.objectStore(store).put(value)
    await done
  }

  async clear(store: IndexedDbStore): Promise<void> {
    const db = await this.open()
    if (!db) {
      throw new Error('Storage unavailable')
    }
    const tx = db.transaction(store, 'readwrite')
    const done = this.complete(tx)
    tx.objectStore(store).clear()
    await done
  }

  private open(): Promise<IDBDatabase | null> {
    if (!this.db) {
      this.db = this.openDatabase()
    }
    return this.db
  }

  private openDatabase(): Promise<IDBDatabase | null> {
    if (!this.supported) {
      return Promise.resolve(null)
    }
    return new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
          const db = request.result
          ENTITY_STORES.forEach((store) => {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' })
            }
          })
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE)
          }
        }
        request.onsuccess = () => {
          const db = request.result
          db.onversionchange = () => {
            db.close()
            this.db = undefined
          }
          resolve(db)
        }
        request.onerror = () => {
          console.trace(request.error)
          resolve(null)
        }
        request.onblocked = () => resolve(null)
      } catch (e) {
        console.trace(e)
        resolve(null)
      }
    })
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private complete(transaction: IDBTransaction): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  }
}
