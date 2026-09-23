import { TestBed } from '@angular/core/testing'
import { ApiLibrary } from '@models'
import { IndexedDbService } from '@services'
import { firstValueFrom } from 'rxjs'
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
      {
        id: 1,
        name: 'Alpha',
        sets: ['KoT:C'],
        text: 'Alpha',
        titles: ['prince'],
        sects: ['Camarilla'],
      } as unknown as ApiLibrary,
      {
        id: 2,
        name: 'Beta',
        sets: ['KoT:C', 'HttB:R'],
        text: 'Beta',
        titles: ['baron', 'prince'],
        sects: ['Anarch'],
      } as unknown as ApiLibrary,
      {
        id: 3,
        name: 'Gamma',
        sets: ['Anarchs:C'],
        text: 'Beta',
        titles: [],
        sects: [],
      } as unknown as ApiLibrary,
    ])
  })

  it.each(['asc', 'desc'] as const)(
    'honors name sorting %s with recommendations before limiting results',
    async (order) => {
      const cards = await firstValueFrom(
        store.selectEntities(2, undefined, 'name', order, undefined, [3, 1, 2]),
      )
      expect(cards.map(({ id }) => id)).toEqual(
        order === 'asc' ? [1, 2] : [3, 2],
      )
    },
  )

  it('preserves recommendation order for relevance and respects filters', async () => {
    const cards = await firstValueFrom(
      store.selectEntities(
        2,
        { notSets: ['HttB'] },
        'relevance',
        'desc',
        undefined,
        [2, 3, 1],
      ),
    )
    expect(cards.map(({ id }) => id)).toEqual([3, 1])
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
      store.getEntities({ titles: ['baron', 'bishop'] }).map(({ id }) => id),
    ).toEqual([2])
    expect(
      store.getEntities({ sects: ['Camarilla', 'Sabbat'] }).map(({ id }) => id),
    ).toEqual([1])
  })

  it('supports not-required title and sect sentinels', () => {
    expect(store.getEntities({ titles: ['none'] }).map(({ id }) => id)).toEqual(
      [3],
    )
    expect(store.getEntities({ sects: ['none'] }).map(({ id }) => id)).toEqual([
      3,
    ])
  })
})
