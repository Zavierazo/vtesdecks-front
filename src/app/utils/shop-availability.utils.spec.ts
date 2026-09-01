import { describe, expect, it } from 'vitest'
import { filterCardsByShopAvailability } from './shop-availability.utils'

describe('filterCardsByShopAvailability', () => {
  const cards = [
    { id: 1 },
    { id: 2, unreleased: true },
    { id: 3 },
  ]

  it('does not restrict cards when no shop is selected', () => {
    expect(filterCardsByShopAvailability(cards)).toBe(cards)
  })

  it('keeps the catalog visible while availability has not loaded', () => {
    expect(filterCardsByShopAvailability(cards, 'DTC')).toBe(cards)
  })

  it('keeps only released cards whose ids are in stock', () => {
    expect(
      filterCardsByShopAvailability(cards, 'DTC', new Set([1, 2])),
    ).toEqual([{ id: 1 }])
  })
})
