import { TestBed } from '@angular/core/testing'
import { ApiCrypt, ApiLibrary } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { firstValueFrom, of, Subject, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { encodeSnapshot } from '../utils/deck-snapshot'
import { DeckSnapshotService } from './deck-snapshot.service'

describe('DeckSnapshotService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    TestBed.resetTestingModule()
  })
  function setup(fail = false) {
    const crypt = [{ id: 200001, capacity: 5, type: 'Vampire' }] as ApiCrypt[]
    const library = [
      { id: 100001, type: 'Master', trifle: true },
    ] as ApiLibrary[]
    const ready = new Subject<ApiCrypt[]>()
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CryptQuery,
          useValue: {
            getAll: () => (fail ? [] : crypt),
            getDisciplines: () => [],
          },
        },
        {
          provide: LibraryQuery,
          useValue: {
            getAll: () => (fail ? [] : library),
            getDisciplines: () => [],
            getClans: () => [],
          },
        },
        {
          provide: CryptService,
          useValue: {
            getCryptCards: () =>
              fail ? throwError(() => new Error('offline')) : ready,
          },
        },
        {
          provide: LibraryService,
          useValue: { getLibraryCards: () => of(library) },
        },
      ],
    })
    return { service: TestBed.inject(DeckSnapshotService), ready, crypt }
  }

  it('waits for catalogs and builds a read-only deck with unknown cards preserved separately', async () => {
    const { service, ready, crypt } = setup()
    const fragment = await encodeSnapshot({
      name: 'Frozen',
      author: 'Author',
      description: '',
      cards: [
        [200001, 3],
        [100001, 0],
        [299999, 2],
      ],
    })
    let completed = false
    const result = firstValueFrom(service.load(fragment)).then((value) => {
      completed = true
      return value
    })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(completed).toBe(false)
    ready.next(crypt)
    ready.complete()
    const { deck, unknown } = await result
    expect(deck).toMatchObject({
      id: '',
      owner: false,
      published: false,
      name: 'Frozen',
      stats: { crypt: 5, library: 0, masterTrifle: 0 },
    })
    expect(deck.library).toEqual([{ id: 100001, number: 0, type: 'Master' }])
    expect(unknown).toEqual([{ id: 299999, number: 2, type: undefined }])
  })

  it('distinguishes catalog failures from invalid links', async () => {
    const { service } = setup(true)
    const fragment = await encodeSnapshot({
      name: '',
      author: '',
      description: '',
      cards: [],
    })
    await expect(firstValueFrom(service.load(fragment))).rejects.toThrow(
      'catalog_error',
    )
    await expect(
      firstValueFrom(service.load('/deck/snapshot#v1=AAAA')),
    ).rejects.toThrow('Invalid snapshot link')
  })
})
