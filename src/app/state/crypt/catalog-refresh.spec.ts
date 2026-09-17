import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCrypt, ApiLibrary } from '@models'
import { ApiDataService, IndexedDbService } from '@services'
import { firstValueFrom, forkJoin, of, Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../services/connectivity.service'
import { LibraryService } from '../library/library.service'
import { LibraryStore } from '../library/library.store'
import { CryptService } from './crypt.service'
import { CryptStore } from './crypt.store'

const crypt = { id: 200001, name: 'Cached crypt' } as ApiCrypt
const library = { id: 100001, name: 'Cached library' } as ApiLibrary

describe('Catalog refresh for deck initialization', () => {
  afterEach(() => TestBed.resetTestingModule())

  function setup(cached: boolean) {
    const cryptResponse = new Subject<ApiCrypt[]>()
    const libraryResponse = new Subject<ApiLibrary[]>()
    const db = {
      getAll: vi.fn((store: string) =>
        Promise.resolve(cached ? [store === 'crypt' ? crypt : library] : []),
      ),
      getMeta: vi.fn().mockResolvedValue({ locale: 'en', lastUpdate: 'v1' }),
      replaceCatalog: vi.fn().mockResolvedValue(undefined),
    }
    const api = {
      getCryptLastUpdate: vi.fn(() => of({ lastUpdate: 'v2' })),
      getLibraryLastUpdate: vi.fn(() => of({ lastUpdate: 'v2' })),
      getAllCrypt: vi.fn(() => cryptResponse),
      getAllLibrary: vi.fn(() => libraryResponse),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: IndexedDbService, useValue: db },
        { provide: ApiDataService, useValue: api },
        { provide: TranslocoService, useValue: { getActiveLang: () => 'en' } },
        {
          provide: ConnectivityService,
          useValue: { offline: signal(false), resumed: new Subject<void>() },
        },
      ],
    })
    return { db, api, cryptResponse, libraryResponse }
  }

  it.each([true, false])(
    'waits for both catalogs with cached data = %s',
    async (cached) => {
      const { api, cryptResponse, libraryResponse } = setup(cached)
      const initialized = vi.fn()
      const finished = firstValueFrom(
        forkJoin([
          TestBed.inject(CryptService).getCryptCards(),
          TestBed.inject(LibraryService).getLibraryCards(),
        ]),
      ).then(initialized)
      await vi.waitFor(() => expect(api.getAllLibrary).toHaveBeenCalledOnce())
      expect(initialized).not.toHaveBeenCalled()
      cryptResponse.next([crypt])
      await vi.waitFor(() =>
        expect(TestBed.inject(CryptStore).getEntities()).toEqual([crypt]),
      )
      expect(initialized).not.toHaveBeenCalled()
      libraryResponse.next([library])
      await finished
      expect(initialized).toHaveBeenCalledExactlyOnceWith([[crypt], [library]])
    },
  )

  it('keeps current cards until replacement is ready, then removes absent IDs', async () => {
    const { db } = setup(true)
    const cryptStore = TestBed.inject(CryptStore)
    const libraryStore = TestBed.inject(LibraryStore)
    await Promise.all([cryptStore.ready, libraryStore.ready])
    let finishWrite!: () => void
    db.replaceCatalog.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve
        }),
    )
    const addedCrypt = { ...crypt, id: 200002 }
    const cryptWrite = cryptStore.replaceCatalog(
      [addedCrypt],
      'en',
      new Date(1),
    )
    expect(cryptStore.getEntities()).toEqual([crypt])
    finishWrite()
    await cryptWrite
    expect(cryptStore.getEntities()).toEqual([addedCrypt])
    expect(cryptStore.getEntity(crypt.id)).toBeUndefined()

    const addedLibrary = { ...library, id: 100002 }
    const libraryWrite = libraryStore.replaceCatalog(
      [addedLibrary],
      'en',
      new Date(1),
    )
    expect(libraryStore.getEntities()).toEqual([library])
    finishWrite()
    await libraryWrite
    expect(libraryStore.getEntities()).toEqual([addedLibrary])
    expect(libraryStore.getEntity(library.id)).toBeUndefined()
    expect(db.replaceCatalog).toHaveBeenCalledWith(
      'crypt',
      [addedCrypt],
      'crypt_state',
      expect.anything(),
    )
    expect(db.replaceCatalog).toHaveBeenCalledWith(
      'library',
      [addedLibrary],
      'library_state',
      expect.anything(),
    )
  })
})
