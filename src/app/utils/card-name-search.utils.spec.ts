import { TestBed } from '@angular/core/testing'
import { ApiCrypt, ApiLibrary } from '@models'
import { IndexedDbService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptStore } from '@state/crypt/crypt.store'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryStore } from '@state/library/library.store'
import { SetQuery } from '@state/set/set.query'
import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compareCardNames, matchesCardName } from './card-name-search.utils'

describe('shared card-name matching', () => {
  const card = {
    name: 'Hunting the Beast',
    aka: 'Ancient Pursuit',
    i18n: { name: 'Cazando a la Bestia' },
  }

  it.each([
    'beast',
    'hunting',
    'Hunting the beast',
    'HUNTING-THE BEAST',
    'hunting the beest',
    '/^hunting/',
    'bestia',
    'ancient pursuit',
  ])('matches %s across all available names', (term) => {
    expect(matchesCardName(card, term)).toBe(true)
  })

  it('normalizes accents and handles invalid regex safely', () => {
    expect(matchesCardName({ name: 'Éléonore' }, 'eleonore')).toBe(true)
    expect(matchesCardName(card, '/[/')).toBe(false)
    expect(matchesCardName(undefined, 'beast')).toBe(false)
  })

  it('ranks exact names, translations and aliases above partial and fuzzy matches', () => {
    for (const term of [
      'hunting the beast',
      'cazando a la bestia',
      'ancient pursuit',
    ]) {
      const partial = { name: `${term} extra` }
      expect(compareCardNames(card, partial, term)).toBeLessThan(0)
    }
    expect(
      compareCardNames(card, { name: 'Hunting Grounds' }, 'hunting the beast'),
    ).toBeLessThan(0)
  })
})

describe.each(['crypt', 'library'] as const)(
  '%s name search integration',
  (kind) => {
    let store: CryptStore | LibraryStore
    let query: CryptQuery | LibraryQuery

    beforeEach(async () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: IndexedDbService,
            useValue: {
              getAll: vi.fn().mockResolvedValue([]),
              putAll: vi.fn().mockResolvedValue(undefined),
            },
          },
          { provide: SetQuery, useValue: {} },
        ],
      })
      store =
        kind === 'crypt'
          ? TestBed.inject(CryptStore)
          : TestBed.inject(LibraryStore)
      query =
        kind === 'crypt'
          ? TestBed.inject(CryptQuery)
          : TestBed.inject(LibraryQuery)
      await store.ready
    })

    it.each(['beast', 'hunting', 'Hunting the beast'])(
      'ranks the full catalog before limiting autocomplete for %s',
      async (term) => {
        const cards = [
          ...Array.from({ length: 15 }, (_, id) => ({
            id,
            sets: [],
            name: term === 'beast' ? 'Feast' : 'Haunting the Feast',
          })),
          { id: 100, name: 'Hunting the Beast', sets: [] },
        ] as unknown as (ApiCrypt & ApiLibrary)[]
        store.set(cards)
        expect(store.getEntities({ name: term }).length).toBeGreaterThan(10)
        const resultPromise = firstValueFrom<(ApiCrypt | ApiLibrary)[]>(
          query.selectByName(term, 10),
        )
        TestBed.tick()
        const result = await resultPromise
        expect(result[0].id).toBe(100)
        expect(result.map(({ id }) => id)).toEqual(
          store
            .getEntities({ name: term }, 'trigramSimilarity', 'desc')
            .slice(0, 10)
            .map(({ id }) => id),
        )
      },
    )

    it('matches aliases even with a translation and still applies other filters', () => {
      store.set([
        {
          id: 100,
          sets: [],
          name: 'Hunting the Beast',
          aka: 'Ancient Pursuit',
          i18n: { name: 'Cazando a la Bestia' },
          printOnDemand: false,
        },
      ] as unknown as (ApiCrypt & ApiLibrary)[])
      for (const name of ['ancient pursuit', 'bestia']) {
        expect(store.getEntities({ name }).map(({ id }) => id)).toEqual([100])
        expect(store.getEntities({ name, printOnDemand: true })).toEqual([])
      }
    })
  },
)
