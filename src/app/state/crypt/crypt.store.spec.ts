import { TestBed } from '@angular/core/testing'
import { ApiCrypt } from '@models'
import { IndexedDbService } from '@services'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CryptStore } from './crypt.store'

describe('CryptStore set filtering', () => {
  let store: CryptStore

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
    store = TestBed.inject(CryptStore)
    store.set([
      { id: 1, sets: ['KoT:C'], text: 'Alpha' } as ApiCrypt,
      { id: 2, sets: ['KoT:C', 'HttB:R'], text: 'Beta' } as ApiCrypt,
      { id: 3, sets: ['Anarchs:C'], text: 'Beta' } as ApiCrypt,
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
