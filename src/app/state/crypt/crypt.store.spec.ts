import { TestBed } from '@angular/core/testing'
import { ApiCrypt } from '@models'
import { IndexedDbService } from '@services'
import { firstValueFrom } from 'rxjs'
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
        name: 'Alpha',
        sets: ['KoT:C'],
        text: 'Alpha',
        title: 'prince',
        votes: 3,
        sect: 'Camarilla',
      } as ApiCrypt,
      {
        id: 2,
        name: 'Beta',
        sets: ['KoT:C', 'HttB:R'],
        text: 'Beta',
        title: 'baron',
        votes: 1,
        sect: 'Anarch',
      } as ApiCrypt,
      {
        id: 3,
        name: 'Gamma',
        sets: ['Anarchs:C'],
        text: 'Beta',
        votes: 0,
        sect: '',
      } as ApiCrypt,
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

  it('filters by the vote count supplied by the API', () => {
    expect(
      store.getEntities({ votesSlider: [2, 3] }).map(({ id }) => id),
    ).toEqual([1])
  })
})
