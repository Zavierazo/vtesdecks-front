import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { Subject } from 'rxjs'
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
    resumed: Subject<void>
  }
  let write: ReturnType<typeof vi.fn>
  let fetchMock: ReturnType<typeof vi.fn>
  let decode: ReturnType<typeof vi.fn>
  let clear: ReturnType<typeof vi.fn>
  const blob = () => new Blob(['valid image'], { type: 'image/jpeg' })
  const response = () => ({
    ok: true,
    headers: new Headers({ 'Content-Type': 'image/jpeg' }),
    blob: async () => blob(),
  })

  beforeEach(async () => {
    cache = new Map()
    connection = { offline: signal(false), resumed: new Subject<void>() }
    write = vi.fn().mockResolvedValue(undefined)
    clear = vi.fn().mockResolvedValue(undefined)
    fetchMock = vi.fn().mockImplementation(async () => response())
    decode = vi.fn().mockResolvedValue(undefined)
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
        match: async (key: string) => cache.get(key),
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
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows the local image before revalidation completes, keeps it stable until the next opening', async () => {
    cache.set(url, { blob: async () => blob() })
    const network = deferred<ReturnType<typeof response>>()
    fetchMock.mockReturnValue(network.promise)
    expect(service.acquire(url)).toBe(MISSING_CARD_IMAGE)
    await vi.waitFor(() => expect(service.display(url)).toMatch(/^blob:/))
    const old = service.display(url)
    network.resolve(response())
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(service.display(url)).toBe(old)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(old)
    service.release(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(old)
    connection.offline.set(true)
    service.acquire(url)
    await vi.waitFor(() => expect(service.display(url)).toMatch(/^blob:/))
    expect(service.display(url)).not.toBe(old)
    expect(fetchMock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ cache: 'no-cache', mode: 'cors' }),
    )
  })

  it('lets a new view use the updated cache while an existing view stays unchanged', async () => {
    const original = blob()
    cache.set(url, { blob: async () => original })
    connection.offline.set(true)
    const grid = Symbol('grid')
    const modal = Symbol('modal')
    service.acquire(url, undefined, MISSING_CARD_IMAGE, grid)
    await vi.waitFor(() => expect(service.display(url, grid)).toMatch(/^blob:/))
    const old = service.display(url, grid)
    connection.offline.set(false)
    const updated = await service.revalidate(url)
    expect(await cache.get(url)!.blob()).toBe(updated)
    expect(service.display(url, grid)).toBe(old)
    connection.offline.set(true)
    service.acquire(url, undefined, MISSING_CARD_IMAGE, modal)
    await vi.waitFor(() =>
      expect(service.display(url, modal)).toMatch(/^blob:/),
    )
    expect(URL.createObjectURL).toHaveBeenLastCalledWith(updated)
    expect(service.display(url, grid)).toBe(old)
    service.release(url, modal)
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(old)
    service.release(url, grid)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(old)
  })

  it('shows a first download immediately when no local image exists', async () => {
    service.acquire(url)
    await vi.waitFor(() => expect(service.display(url)).toMatch(/^blob:/))
    expect(cache.has(url)).toBe(true)
  })

  it('groups concurrent requests and keeps the last image if decoding fails', async () => {
    await service.revalidate(url)
    connection.offline.set(true)
    service.acquire(url)
    await vi.waitFor(() => expect(service.display(url)).toMatch(/^blob:/))
    const old = service.display(url)
    connection.offline.set(false)
    decode.mockRejectedValue(new Error('corrupt image'))
    const first = service.revalidate(url)
    expect(service.revalidate(url)).toBe(first)
    await expect(first).rejects.toThrow('corrupt')
    expect(service.display(url)).toBe(old)
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
    connection.resumed.next()
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
    service.acquire(url)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchMock).not.toHaveBeenCalled()
    connection.offline.set(false)
    connection.resumed.next()
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce())
    expect(service.busy()).toBe(false)
    service.release(url)
    connection.resumed.next()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('tries the original image after reconnect when the selected printing is unavailable', async () => {
    const fallback = 'https://cdn.test/original.jpg'
    connection.offline.set(true)
    service.acquire(url, fallback)
    await new Promise((resolve) => setTimeout(resolve, 0))
    fetchMock.mockImplementation(async (requested: string) => {
      if (requested === url) {
        throw new Error('Printing not found')
      }
      return response()
    })
    connection.offline.set(false)
    connection.resumed.next()
    await vi.waitFor(() => expect(service.display(url)).toMatch(/^blob:/))
    expect(fetchMock).toHaveBeenCalledWith(fallback, expect.anything())
  })
})
