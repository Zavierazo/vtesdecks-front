import { inject, Injectable, signal } from '@angular/core'
import {
  catchError,
  firstValueFrom,
  from,
  Observable,
  of,
  Subject,
  timeout,
} from 'rxjs'
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
  private readonly cleared = new Subject<void>()
  readonly estimateBytes = signal<number | null>(null)
  readonly ready = this.loadMetadata()
  private readonly requests = new Map<string, Promise<Blob>>()
  private cancelled = false
  private generation = 0
  private clearing = false

  private async loadMetadata() {
    this.records.set(await this.db.getAll<OfflineImage>('images'))
  }

  observe(
    url: string,
    fallback?: string,
    placeholder = MISSING_CARD_IMAGE,
  ): Observable<string> {
    return new Observable<string>((subscriber) => {
      let objectUrl: string | undefined
      let revision = 0
      let offline = this.connection.offline()
      const release = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = undefined
        }
      }
      const load = async () => {
        const current = ++revision
        const blob = await firstValueFrom(
          from(this.readCached(url, offline ? fallback : undefined)).pipe(
            timeout(1500),
            catchError(() => {
              this.storageError.set(true)
              return of(undefined)
            }),
          ),
        )
        if (subscriber.closed || current !== revision) {
          return
        }
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          subscriber.next(objectUrl)
        } else if (!this.connection.offline()) {
          subscriber.next(url)
          void this.revalidate(url)
            .then(() => {
              if (
                !subscriber.closed &&
                this.connection.offline() &&
                !objectUrl
              ) {
                void load()
              }
            })
            .catch(() => undefined)
        } else {
          subscriber.next(placeholder)
        }
      }
      subscriber.next(placeholder)
      void load()
      const connectivity = this.connection.changed.subscribe(() => {
        const nextOffline = this.connection.offline()
        if (offline === nextOffline) {
          return
        }
        offline = nextOffline
        if (!objectUrl) {
          void load()
        }
      })
      const cleared = this.cleared.subscribe(() => {
        revision++
        release()
        subscriber.next(this.connection.offline() ? placeholder : url)
      })
      return () => {
        connectivity.unsubscribe()
        cleared.unsubscribe()
        release()
      }
    })
  }

  private async readCached(
    url: string,
    fallback?: string,
  ): Promise<Blob | undefined> {
    const cache = await caches.open(CACHE)
    for (const candidate of new Set(
      [url, fallback].filter((value): value is string => !!value),
    )) {
      const response = await cache.match(candidate)
      if (response) {
        const blob = await response.blob()
        try {
          await this.validate(blob)
          return blob
        } catch {
          // Treat corrupt cached images as missing, allowing the CDN or fallback.
        }
      }
    }
    return undefined
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
      await firstValueFrom(from(image.decode()).pipe(timeout(1500)))
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
      this.cleared.next()
    } catch {
      this.storageError.set(true)
    } finally {
      this.clearing = false
      this.busy.set(false)
    }
  }
}
