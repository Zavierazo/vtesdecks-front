import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCrypt } from '@models'
import { ApiDataService, IndexedDbService } from '@services'
import { firstValueFrom, lastValueFrom, of, Subject, throwError } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../services/connectivity.service'
import { CryptService } from './crypt.service'
import { CryptStore } from './crypt.store'

const oldCard = { id: 200001, name: 'Old', text: 'Local text' } as ApiCrypt
const newCard = { ...oldCard, name: 'New' }
describe('Offline crypt catalogs', () => {
  let locale: string
  let connection: {
    offline: ReturnType<typeof signal<boolean>>
    resumed: Subject<void>
  }
  let db: {
    getAll: ReturnType<typeof vi.fn>
    getMeta: ReturnType<typeof vi.fn>
    replaceCatalog: ReturnType<typeof vi.fn>
  }
  let api: {
    getAllCrypt: ReturnType<typeof vi.fn>
    getCryptLastUpdate: ReturnType<typeof vi.fn>
  }
  beforeEach(() => {
    locale = 'en'
    connection = { offline: signal(false), resumed: new Subject<void>() }
    db = {
      getAll: vi.fn().mockResolvedValue([oldCard]),
      getMeta: vi.fn().mockResolvedValue({ locale: 'en', lastUpdate: 'v1' }),
      replaceCatalog: vi.fn().mockResolvedValue(undefined),
    }
    api = {
      getAllCrypt: vi.fn(() => of([newCard])),
      getCryptLastUpdate: vi.fn(() => of({ lastUpdate: 'v2' })),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: db },
        { provide: ApiDataService, useValue: api },
        { provide: ConnectivityService, useValue: connection },
        {
          provide: TranslocoService,
          useValue: { getActiveLang: () => locale },
        },
      ],
    })
  })
  it('restores offline without calling the API and preserves the downloaded language', async () => {
    connection.offline.set(true)
    locale = 'es'
    const cards = await firstValueFrom(
      TestBed.inject(CryptService).getCryptCards(),
    )
    expect(cards).toEqual([oldCard])
    expect(TestBed.inject(CryptStore).getValue().locale).toBe('en')
    expect(api.getCryptLastUpdate).not.toHaveBeenCalled()
  })
  it('emits local data while the server is pending and commits data and language together', async () => {
    const pending = new Subject<{ lastUpdate: string }>()
    api.getCryptLastUpdate.mockReturnValue(pending)
    const received: ApiCrypt[][] = []
    const completed = new Promise<void>((resolve) =>
      TestBed.inject(CryptService)
        .getCryptCards()
        .subscribe({
          next: (value) => received.push(value),
          complete: resolve,
        }),
    )
    await vi.waitFor(() => expect(received).toEqual([[oldCard]]))
    pending.next({ lastUpdate: 'v2' })
    pending.complete()
    await completed
    expect(received).toEqual([[oldCard], [newCard]])
    expect(db.replaceCatalog).toHaveBeenCalledWith(
      'crypt',
      [newCard],
      'crypt_state',
      expect.objectContaining({ locale: 'en', lastUpdate: 'v2' }),
    )
  })
  it('keeps the old catalog when a language update fails', async () => {
    locale = 'fr'
    api.getAllCrypt.mockReturnValue(throwError(() => new Error('server down')))
    await lastValueFrom(TestBed.inject(CryptService).getCryptCards())
    expect(TestBed.inject(CryptStore).getEntities()).toEqual([oldCard])
    expect(TestBed.inject(CryptStore).getValue().locale).toBe('en')
    expect(db.replaceCatalog).not.toHaveBeenCalled()
  })
  it('reports storage failure without blocking freshly fetched content', async () => {
    db.replaceCatalog.mockRejectedValue(
      new DOMException('full', 'QuotaExceededError'),
    )
    await lastValueFrom(TestBed.inject(CryptService).getCryptCards())
    expect(TestBed.inject(CryptStore).storageError()).toBe(true)
    expect(TestBed.inject(CryptStore).getEntities()).toEqual([newCard])
  })
  it('downloads a new language even when the server version is unchanged', async () => {
    locale = 'pt'
    api.getCryptLastUpdate.mockReturnValue(of({ lastUpdate: 'v1' }))
    await lastValueFrom(TestBed.inject(CryptService).getCryptCards())
    expect(api.getAllCrypt).toHaveBeenCalledOnce()
    expect(TestBed.inject(CryptStore).getValue().locale).toBe('pt')
  })
})
