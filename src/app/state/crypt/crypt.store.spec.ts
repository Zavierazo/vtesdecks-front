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
      {
        id: 1,
        sets: ['KoT:C'],
        text: 'Alpha',
        title: 'prince',
        sect: 'Camarilla',
      } as ApiCrypt,
      {
        id: 2,
        sets: ['KoT:C', 'HttB:R'],
        text: 'Beta',
        title: 'baron',
        sect: 'Anarch',
      } as ApiCrypt,
      { id: 3, sets: ['Anarchs:C'], text: 'Beta', sect: '' } as ApiCrypt,
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

  it('matches any selected title or sect', () => {
    expect(
      store.getEntities({ titles: ['baron', 'prince'] }).map(({ id }) => id),
    ).toEqual([1, 2])
    expect(
      store.getEntities({ sects: ['Anarch', 'Sabbat'] }).map(({ id }) => id),
    ).toEqual([2])
  })

  it('supports any-title and no-title sentinels', () => {
    expect(store.getEntities({ titles: ['any'] }).map(({ id }) => id)).toEqual([
      1, 2,
    ])
    expect(store.getEntities({ titles: ['none'] }).map(({ id }) => id)).toEqual(
      [3],
    )
  })
})
