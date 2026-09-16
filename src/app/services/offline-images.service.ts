import { inject, Injectable, signal } from '@angular/core'
import { Subject } from 'rxjs'
import { ConnectivityService } from './connectivity.service'
import { IndexedDbService } from './indexed-db.service'

export interface OfflineImage {
  id: string
  bytes: number
  checkedAt: number
}
const CACHE = 'vtesdecks-card-images-v1'
export const MISSING_CARD_IMAGE = '/assets/img/cardbacklibrary.jpg'

@Injectable({ providedIn: 'root' })
export class OfflineImagesService {
  private readonly db = inject(IndexedDbService)
  private readonly connection = inject(ConnectivityService)
  readonly records = signal<OfflineImage[]>([])
  readonly busy = signal(false)
  readonly progress = signal({ done: 0, total: 0, errors: 0 })
  readonly storageError = signal(false)
  readonly changed = new Subject<string>()
  readonly estimateBytes = signal<number | null>(null)
  readonly ready = this.loadMetadata()
  private readonly active = new Map<
    string | symbol,
    {
      url: string
      refs: number
      display: string
      placeholder: string
      blob?: string
      fallback?: string
    }
  >()
  private readonly requests = new Map<string, Promise<Blob>>()
  private cancelled = false
  private generation = 0
  private clearing = false

  constructor() {
    this.connection.resumed.subscribe(() => {
      for (const url of new Set(
        [...this.active.values()].map((entry) => entry.url),
      )) {
        void this.revalidate(url).catch(() => undefined)
      }
    })
  }

  private async loadMetadata() {
    this.records.set(await this.db.getAll<OfflineImage>('images'))
  }

  acquire(
    url: string,
    fallback?: string,
    placeholder = MISSING_CARD_IMAGE,
    consumer: string | symbol = url,
  ): string {
    let entry = this.active.get(consumer)
    if (!entry) {
      entry = { url, refs: 0, display: placeholder, placeholder, fallback }
      this.active.set(consumer, entry)
      void this.load(url, consumer)
    }
    entry.refs++
    return entry.display
  }

  display(url: string, consumer: string | symbol = url): string {
    return this.active.get(consumer)?.display ?? MISSING_CARD_IMAGE
  }

  release(url: string, consumer: string | symbol = url) {
    const entry = this.active.get(consumer)
    if (entry && --entry.refs <= 0) {
      if (entry.blob) {
        URL.revokeObjectURL(entry.blob)
      }
      this.active.delete(consumer)
    }
  }

  private show(url: string, blob: Blob, consumer?: string | symbol) {
    let changed = false
    for (const [key, entry] of this.active) {
      // Each view keeps its first valid image until released. Revalidation
      // updates persistence, but never replaces an image already on screen.
      if (
        entry.url !== url ||
        entry.blob ||
        (consumer !== undefined && key !== consumer)
      ) {
        continue
      }
      entry.blob = URL.createObjectURL(blob)
      entry.display = entry.blob
      changed = true
    }
    if (changed) {
      this.changed.next(url)
    }
  }

  private async load(url: string, consumer: string | symbol) {
    const originalEntry = this.active.get(consumer)
    const generation = this.generation
    try {
      const cached = await (await caches.open(CACHE)).match(url)
      if (
        cached &&
        generation === this.generation &&
        this.active.get(consumer) === originalEntry
      ) {
        this.show(url, await cached.blob(), consumer)
      }
    } catch {
      this.storageError.set(true)
    }
    if (!this.connection.offline()) {
      try {
        await this.revalidate(url)
        return
      } catch {
        /* Retain the cached image or try the original. */
      }
    }
    const entry = this.active.get(consumer)
    if (entry !== originalEntry || generation !== this.generation) {
      return
    }
    if (entry?.fallback && entry.display === entry.placeholder) {
      try {
        const cached = await (await caches.open(CACHE)).match(entry.fallback)
        if (cached) {
          this.show(url, await cached.blob(), consumer)
        } else if (!this.connection.offline()) {
          this.show(url, await this.revalidate(entry.fallback), consumer)
        }
      } catch {
        /* Keep the explicit missing-image placeholder. */
      }
    }
  }

  revalidate(url: string): Promise<Blob> {
    const pending = this.requests.get(url)
    if (pending) {
      return pending
    }
    if (this.connection.offline() || this.clearing) {
      return Promise.reject(new Error('Offline'))
    }
    const generation = this.generation
    const request = (async () => {
      const response = await fetch(url, {
        cache: 'no-cache',
        mode: 'cors',
        signal: AbortSignal.timeout(30000),
      })
      if (
        !response.ok ||
        !response.headers.get('Content-Type')?.startsWith('image/')
      ) {
        throw new Error('Invalid image response')
      }
      const blob = await response.blob()
      await this.validate(blob)
      if (generation !== this.generation) {
        return blob
      }
      // Fill missing images immediately; existing views keep their current copy.
      this.show(url, blob)
      try {
        const cache = await caches.open(CACHE)
        await cache.put(
          url,
          new Response(blob, { headers: { 'Content-Type': blob.type } }),
        )
        const record = { id: url, bytes: blob.size, checkedAt: Date.now() }
        await this.db.write('images', record)
        this.records.update((items) => [
          ...items.filter((item) => item.id !== url),
          record,
        ])
      } catch (error) {
        this.storageError.set(true)
        throw error
      }
      return blob
    })()
    this.requests.set(url, request)
    void request
      .finally(() => {
        this.requests.delete(url)
      })
      .catch(() => undefined)
    return request
  }

  private async validate(blob: Blob) {
    const url = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error('Empty image')
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async estimate(urls: string[]) {
    const samples = [...new Set(urls)]
      .filter(
        (_, index, all) =>
          index % Math.max(1, Math.floor(all.length / 5)) === 0,
      )
      .slice(0, 5)
    const sizes: number[] = []
    for (const url of samples) {
      try {
        sizes.push((await this.revalidate(url)).size)
      } catch {
        /* Keep successful samples. */
      }
    }
    this.estimateBytes.set(
      sizes.length
        ? Math.round(
            (sizes.reduce((a, b) => a + b, 0) / sizes.length) *
              new Set(urls).size,
          )
        : null,
    )
  }

  async download(urls: string[], refresh = false) {
    if (this.busy() || this.connection.offline()) {
      return
    }
    this.busy.set(true)
    this.cancelled = false
    this.storageError.set(false)
    this.progress.set({ done: 0, total: new Set(urls).size, errors: 0 })
    try {
      await this.ready
      await navigator.storage?.persist?.().catch(() => false)
      const queue = [...new Set(urls)]
      const cache = await caches.open(CACHE)
      const worker = async () => {
        while (queue.length && !this.cancelled && !this.connection.offline()) {
          const url = queue.shift()!
          try {
            const cached = await cache.match(url)
            if (refresh || !cached) {
              await this.revalidate(url)
            } else if (!this.records().some((record) => record.id === url)) {
              const blob = await cached.blob()
              const record = {
                id: url,
                bytes: blob.size,
                checkedAt: Date.now(),
              }
              await this.db.write('images', record)
              this.records.update((records) => [...records, record])
            }
            this.progress.update((p) => ({ ...p, done: p.done + 1 }))
          } catch {
            this.progress.update((p) => ({ ...p, errors: p.errors + 1 }))
            if (this.storageError()) {
              this.cancelled = true
            }
          }
        }
      }
      await Promise.all(Array.from({ length: 4 }, worker))
    } catch {
      this.storageError.set(true)
      this.progress.update((p) => ({ ...p, errors: p.errors + 1 }))
    } finally {
      this.busy.set(false)
    }
  }

  cancel() {
    this.cancelled = true
  }

  async clear() {
    if (this.busy()) {
      return
    }
    this.clearing = true
    this.busy.set(true)
    this.generation++
    // Drain visible revalidations before deleting so they cannot restore deleted entries.
    await Promise.allSettled([...this.requests.values()])
    try {
      await caches.delete(CACHE)
      await this.db.clear('images')
      this.records.set([])
      this.progress.set({ done: 0, total: 0, errors: 0 })
      this.storageError.set(false)
      for (const entry of this.active.values()) {
        if (entry.blob) {
          URL.revokeObjectURL(entry.blob)
        }
        entry.blob = undefined
        entry.display = entry.placeholder
        this.changed.next(entry.url)
      }
    } catch {
      this.storageError.set(true)
    } finally {
      this.clearing = false
      this.busy.set(false)
    }
  }
}
