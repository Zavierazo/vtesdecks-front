import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { Subject, Subscription } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from './connectivity.service'
import { IndexedDbService } from './indexed-db.service'
import {
  MISSING_CARD_IMAGE,
  OfflineImagesService,
} from './offline-images.service'

const url = 'https://cdn.test/card.jpg'
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('OfflineImagesService', () => {
  let service: OfflineImagesService
  let cache: Map<string, { blob: () => Promise<Blob> }>
  let connection: {
    offline: ReturnType<typeof signal<boolean>>
    changed: Subject<void>
  }
  let write: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>
  let decode: ReturnType<typeof vi.fn>
  let clear: ReturnType<typeof vi.fn>
  let match: ReturnType<typeof vi.fn>
  const blob = () => new Blob(['valid image'], { type: 'image/jpeg' })
  const response = () => ({
    ok: true,
    headers: new Headers({ 'Content-Type': 'image/jpeg' }),
    blob: async () => blob(),
  })

  const views = new Map<
    string | symbol,
    { value: string; subscription: Subscription }
  >()
  function acquire(
    imageUrl: string,
    fallback?: string,
    placeholder = MISSING_CARD_IMAGE,
    consumer: string | symbol = imageUrl,
  ) {
    const view = { value: '', subscription: new Subscription() }
    views.set(consumer, view)
    view.subscription = service
      .observe(imageUrl, fallback, placeholder)
      .subscribe((value) => {
        view.value = value
      })
    return view.value
  }
  function display(imageUrl: string, consumer: string | symbol = imageUrl) {
    return views.get(consumer)?.value
  }
  function release(imageUrl: string, consumer: string | symbol = imageUrl) {
    views.get(consumer)?.subscription.unsubscribe()
    views.delete(consumer)
  }

  beforeEach(async () => {
    cache = new Map()
    connection = { offline: signal(false), changed: new Subject<void>() }
    write = vi.fn().mockResolvedValue(undefined)
    clear = vi.fn().mockResolvedValue(undefined)
    fetchMock = vi.fn().mockImplementation(async () => response())
    decode = vi.fn().mockResolvedValue(undefined)
    match = vi.fn(async (key: string) => cache.get(key))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        naturalWidth = 300
        naturalHeight = 400
        decode = decode
      },
    )
    vi.stubGlobal(
      'Response',
      class {
        constructor(private body: Blob) {}
        async blob() {
          return this.body
        }
      },
    )
    vi.stubGlobal('caches', {
      open: async () => ({
        match,
        put: async (key: string, value: { blob: () => Promise<Blob> }) => {
          cache.set(key, value)
        },
      }),
      delete: async () => {
        cache.clear()
        return true
      },
    })
    let sequence = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      () => `blob:test-${++sequence}`,
    )
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    TestBed.configureTestingModule({
      providers: [
        { provide: ConnectivityService, useValue: connection },
        {
          provide: IndexedDbService,
          useValue: { getAll: async () => [], write, clear },
        },
      ],
    })
    service = TestBed.inject(OfflineImagesService)
    await service.ready
  })
  afterEach(() => {
    views.forEach((view) => view.subscription.unsubscribe())
    views.clear()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses a cached image online without making a network request', async () => {
    const cached = blob()
    cache.set(url, { blob: async () => cached })
    expect(acquire(url)).toBe(MISSING_CARD_IMAGE)
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    expect(URL.createObjectURL).toHaveBeenLastCalledWith(cached)
    const displayed = display(url)
    connection.offline.set(true)
    connection.changed.next()
    connection.offline.set(false)
    connection.changed.next()
    expect(display(url)).toBe(displayed)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(displayed)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    release(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(displayed)
  })

  it('keeps separate offline views stable and releases their blobs independently', async () => {
    const original = blob()
    cache.set(url, { blob: async () => original })
    connection.offline.set(true)
    const grid = Symbol('grid')
    const modal = Symbol('modal')
    acquire(url, undefined, MISSING_CARD_IMAGE, grid)
    await vi.waitFor(() => expect(display(url, grid)).toMatch(/^blob:/))
    const old = display(url, grid)
    const updated = blob()
    cache.set(url, { blob: async () => updated })
    acquire(url, undefined, MISSING_CARD_IMAGE, modal)
    await vi.waitFor(() => expect(display(url, modal)).toMatch(/^blob:/))
    expect(URL.createObjectURL).toHaveBeenLastCalledWith(updated)
    expect(display(url, grid)).toBe(old)
    release(url, modal)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(old)
    release(url, grid)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(old)
  })

  it('uses the CDN for an uncached image while storing it in the background', async () => {
    const network = deferred<ReturnType<typeof response>>()
    fetchMock.mockReturnValue(network.promise)
    expect(acquire(url)).toBe(MISSING_CARD_IMAGE)
    await vi.waitFor(() => expect(display(url)).toBe(url))
    expect(write).not.toHaveBeenCalled()
    network.resolve(response())
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(display(url)).toBe(url)
    expect(cache.has(url)).toBe(true)
    release(url)
    acquire(url)
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('groups concurrent requests and keeps the last image if decoding fails', async () => {
    await service.revalidate(url)
    connection.offline.set(true)
    acquire(url)
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    const cached = await cache.get(url)!.blob()
    const displayed = display(url)
    connection.offline.set(false)
    connection.changed.next()
    decode.mockRejectedValue(new Error('corrupt image'))
    const first = service.revalidate(url)
    expect(service.revalidate(url)).toBe(first)
    await expect(first).rejects.toThrow('corrupt')
    expect(display(url)).toBe(displayed)
    expect(await cache.get(url)!.blob()).toBe(cached)
    expect(write).toHaveBeenCalledOnce()
  })

  it('resumes only missing downloads and never exceeds four concurrent requests', async () => {
    let active = 0
    let maximum = 0
    fetchMock.mockImplementation(async () => {
      active++
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setTimeout(resolve, 1))
      active--
      return response()
    })
    const urls = Array.from({ length: 11 }, (_, i) => `${url}?${i}`)
    await service.download(urls)
    expect(service.progress()).toEqual({ total: 11, done: 11, errors: 0 })
    expect(maximum).toBe(4)
    await service.download(urls)
    expect(fetchMock).toHaveBeenCalledTimes(11)
    connection.changed.next()
    expect(fetchMock).toHaveBeenCalledTimes(11)
  })

  it('retains completed work when cancelled and continues manually', async () => {
    const pending = deferred<ReturnType<typeof response>>()
    fetchMock.mockReturnValue(pending.promise)
    const urls = Array.from({ length: 10 }, (_, i) => `${url}?${i}`)
    const download = service.download(urls)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    service.cancel()
    pending.resolve(response())
    await download
    expect(service.progress().done).toBe(4)
    fetchMock.mockImplementation(async () => response())
    await service.download(urls)
    expect(service.progress().done).toBe(10)
    expect(fetchMock).toHaveBeenCalledTimes(10)
  })

  it('does not report completion on storage failure and clears only images', async () => {
    write.mockRejectedValue(new DOMException('full', 'QuotaExceededError'))
    await service.download([url])
    expect(service.storageError()).toBe(true)
    expect(service.progress()).toEqual({ total: 1, done: 0, errors: 1 })
    await service.clear()
    expect(clear).toHaveBeenCalledExactlyOnceWith('images')
    expect(cache.size).toBe(0)
  })

  it('revalidates visible images on reconnect without starting a bulk download', async () => {
    connection.offline.set(true)
    acquire(url)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
    connection.offline.set(false)
    connection.changed.next()
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(display(url)).toBe(url)
    expect(service.busy()).toBe(false)
    release(url)
    connection.changed.next()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('retains a cached original printing across reconnect without downloading', async () => {
    const fallback = 'https://cdn.test/original.jpg'
    cache.set(fallback, { blob: async () => blob() })
    connection.offline.set(true)
    acquire(url, fallback)
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    const offlineImage = display(url)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockRejectedValue(new Error('Printing not found'))
    connection.offline.set(false)
    connection.changed.next()
    expect(display(url)).toBe(offlineImage)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(offlineImage)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('switches an online view to its cached copy on disconnect', async () => {
    acquire(url)
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    connection.offline.set(true)
    connection.changed.next()
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    expect(fetchMock).toHaveBeenCalledOnce()
    const offlineImage = display(url)
    release(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(offlineImage)
  })

  it('keeps the card back offline when neither printing is cached', async () => {
    connection.offline.set(true)
    const placeholder = '/assets/img/cardbackcrypt.jpg'
    expect(acquire(url, `${url}?original`, placeholder)).toBe(placeholder)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(display(url)).toBe(placeholder)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the cached image when a pending cache read completes after reconnect', async () => {
    const pending = deferred<Blob>()
    cache.set(url, { blob: () => pending.promise })
    connection.offline.set(true)
    acquire(url)
    await new Promise((resolve) => setTimeout(resolve, 0))
    connection.offline.set(false)
    connection.changed.next()
    pending.resolve(blob())
    await vi.waitFor(() => expect(display(url)).toMatch(/^blob:/))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the CDN URL when background caching fails or storage is unavailable', async () => {
    const open = vi.fn().mockRejectedValue(new Error('Storage unavailable'))
    vi.stubGlobal('caches', { open })
    expect(acquire(url)).toBe(MISSING_CARD_IMAGE)
    await vi.waitFor(() => expect(service.storageError()).toBe(true))
    expect(display(url)).toBe(url)
    expect(write).not.toHaveBeenCalled()
  })

  it('clears saved images without changing online display', async () => {
    acquire(url)
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    await service.clear()
    expect(cache.size).toBe(0)
    expect(display(url)).toBe(url)
  })
  it('falls back to the CDN if Cache Storage never responds', async () => {
    vi.useFakeTimers()
    match.mockReturnValue(new Promise(() => undefined))
    acquire(url)
    await vi.advanceTimersByTimeAsync(1501)
    expect(display(url)).toBe(url)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('ignores a corrupt cached image and repairs it in the background', async () => {
    cache.set(url, { blob: async () => blob() })
    decode.mockRejectedValueOnce(new Error('Corrupt cached image'))
    acquire(url)
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(display(url)).toBe(url)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('does not create a display blob after its view is destroyed during a cache read', async () => {
    const pending = deferred<Blob>()
    cache.set(url, { blob: () => pending.promise })
    acquire(url)
    await new Promise((resolve) => setTimeout(resolve, 0))
    release(url)
    pending.resolve(blob())
    await new Promise((resolve) => setTimeout(resolve, 0))
    // A temporary decode URL is allowed, but must be released too.
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(
      vi.mocked(URL.createObjectURL).mock.calls.length,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps loaded CDN images stable when the tab becomes visible again', async () => {
    acquire(url)
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    connection.changed.next()
    expect(display(url)).toBe(url)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
