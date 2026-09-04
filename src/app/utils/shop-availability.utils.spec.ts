import { describe, expect, it } from 'vitest'
import { filterCardsByShopAvailability } from './shop-availability.utils'

describe('filterCardsByShopAvailability', () => {
  const cards = [{ id: 1 }, { id: 2, unreleased: true }, { id: 3 }]

  it('does not restrict cards when no shop is selected', () => {
    expect(filterCardsByShopAvailability(cards)).toBe(cards)
  })

  it('keeps the catalog visible while availability has not loaded', () => {
    expect(filterCardsByShopAvailability(cards, ['DTC'])).toBe(cards)
  })

  it('uses the union of included shops and removes unreleased cards', () => {
    expect(
      filterCardsByShopAvailability(
        cards,
        ['DTC', 'GP'],
        [],
        new Map([
          ['DTC', new Set([1, 2])],
          ['GP', new Set([3])],
        ]),
      ),
    ).toEqual([{ id: 1 }, { id: 3 }])
  })

  it('subtracts excluded shops after combining included shops', () => {
    expect(
      filterCardsByShopAvailability(
        cards,
        ['DTC', 'GP'],
        ['EBAY'],
        new Map([
          ['DTC', new Set([1])],
          ['GP', new Set([3])],
          ['EBAY', new Set([3])],
        ]),
      ),
    ).toEqual([{ id: 1 }])
  })

  it('supports exclude-only filters and lets exclusion win on overlap', () => {
    const availability = new Map([
      ['DTC', new Set([1, 2])],
      ['EBAY', new Set([1])],
    ])

    expect(
      filterCardsByShopAvailability(cards, [], ['EBAY'], availability),
    ).toEqual([{ id: 2, unreleased: true }, { id: 3 }])
    expect(
      filterCardsByShopAvailability(cards, ['DTC'], ['DTC'], availability),
    ).toEqual([])
  })
})
