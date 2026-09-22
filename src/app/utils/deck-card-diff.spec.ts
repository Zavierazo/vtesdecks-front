import { describe, expect, it } from 'vitest'
import { compareCardQuantities } from './deck-card-diff'

describe('card quantity comparison', () => {
  it('reports net additions, removals and edits, omitting considering-only changes', () => {
    expect(
      compareCardQuantities(
        [
          { id: 1, number: 4 },
          { id: 2, number: 2 },
          { id: 3, number: 0 },
        ],
        [
          { id: 1, number: 6 },
          { id: 4, number: 2 },
          { id: 5, number: 0 },
        ],
      ),
    ).toEqual([
      { id: 1, previousQuantity: 4, currentQuantity: 6, difference: 2 },
      { id: 2, previousQuantity: 2, currentQuantity: 0, difference: -2 },
      { id: 4, previousQuantity: 0, currentQuantity: 2, difference: 2 },
    ])
  })
  it('reports swaps even when totals match and hides reverted edits', () => {
    const before = [{ id: 1, number: 4 }]
    expect(compareCardQuantities(before, [{ id: 2, number: 4 }])).toHaveLength(
      2,
    )
    expect(
      compareCardQuantities(before, [...before, { id: 3, number: 0 }]),
    ).toEqual([])
    expect(
      compareCardQuantities(before, [{ id: 1, number: 0 }])[0].difference,
    ).toBe(-4)
  })
})
