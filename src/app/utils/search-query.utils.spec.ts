import {
  buildSearchPath,
  hasMeaningfulSearchFilters,
  normalizeSearchParams,
  searchSignature,
} from './search-query.utils'

describe('search query utilities', () => {
  it('normalizes crypt filters and removes defaults and transient params', () => {
    expect(
      normalizeSearchParams('crypt', {
        name: 'Arika',
        clans: 'ventrue,toreador',
        shop: 'DTC',
        sortBy: 'name',
        sortByOrder: 'asc',
        cardId: '100',
        unsupported: 'value',
      }),
    ).toEqual({ clans: 'ventrue,toreador', name: 'Arika', shops: 'DTC' })
  })

  it('canonicalizes shop lists, ignores unknown shops, and lets exclusions win', () => {
    expect(
      normalizeSearchParams('library', {
        shops: 'DTC,GP,UNKNOWN,DTC',
        notShops: 'GP,EBAY',
      }),
    ).toEqual({ notShops: 'GP,EBAY', shops: 'DTC' })
  })

  it('keeps library filters and non-default sorting', () => {
    expect(
      buildSearchPath('library', {
        types: ['action', 'reaction'],
        bloodCostSlider: [1, 3],
        sortBy: 'minPrice',
        sortByOrder: 'desc',
      }),
    ).toBe(
      '/cards/library?bloodCostSlider=1%2C3&sortBy=minPrice&sortByOrder=desc&types=action%2Creaction',
    )
  })

  it('keeps a narrowed crypt votes range and removes the default range', () => {
    expect(
      normalizeSearchParams('crypt', {
        votes: '2,4',
      }),
    ).toEqual({ votes: '2,4' })
    expect(
      normalizeSearchParams('crypt', {
        votes: [0, 4],
      }),
    ).toEqual({})
    expect(buildSearchPath('crypt', { votes: [1, 3] })).toBe(
      '/cards/crypt?votes=1%2C3',
    )
  })

  it('supports all reusable deck-only filters but not local UI state', () => {
    expect(
      normalizeSearchParams('decks', {
        type: 'TOURNAMENT',
        order: 'POPULAR',
        cards: '100=2,200=1',
        archetype: '3',
        customProportion: 'true',
        page: '2',
      }),
    ).toEqual({
      archetype: '3',
      cards: '100=2,200=1',
      order: 'POPULAR',
      type: 'TOURNAMENT',
    })
  })

  it('produces deterministic signatures regardless of input order', () => {
    expect(searchSignature('crypt', { name: 'A', clans: 'b' })).toBe(
      searchSignature('crypt', { clans: 'b', name: 'A' }),
    )
  })

  it('does not treat sorting alone as a meaningful filtered search', () => {
    expect(
      hasMeaningfulSearchFilters('library', {
        sortBy: 'deckPopularity',
        sortByOrder: 'desc',
      }),
    ).toBe(false)
    expect(hasMeaningfulSearchFilters('decks', { type: 'COMMUNITY' })).toBe(
      true,
    )
  })
})
