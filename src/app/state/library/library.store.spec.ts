import { TestBed } from '@angular/core/testing'
import { ApiLibrary } from '@models'
import { IndexedDbService } from '@services'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LibraryStore } from './library.store'

describe('LibraryStore set filtering', () => {
  let store: LibraryStore

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: IndexedDbService,
          useValue: {
            getAll: vi.fn().mockResolvedValue([]),
            getMeta: vi.fn().mockResolvedValue(undefined),
            putAll: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
    store = TestBed.inject(LibraryStore)
    store.set([
      { id: 1, sets: ['KoT:C'], text: 'Alpha' } as ApiLibrary,
      { id: 2, sets: ['KoT:C', 'HttB:R'], text: 'Beta' } as ApiLibrary,
      { id: 3, sets: ['Anarchs:C'], text: 'Beta' } as ApiLibrary,
    ])
  })

  it('combines set inclusion and exclusion with later filters', () => {
    expect(
      store
        .getEntities({
          sets: ['KoT', 'Anarchs'],
          notSets: ['HttB'],
          cardText: 'Beta',
        })
        .map((card) => card.id),
    ).toEqual([3])
  })
})
