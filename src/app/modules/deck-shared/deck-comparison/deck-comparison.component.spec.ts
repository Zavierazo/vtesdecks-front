import { signal } from '@angular/core'
import { ApiDeck } from '@models'
import { describe, expect, it } from 'vitest'
import { DeckComparisonComponent } from './deck-comparison.component'

describe('Public deck quantity comparison', () => {
  it('keeps direction and display fields while omitting zero-only removals', () => {
    const context = {
      comparisonDeck: signal({
        library: [
          { id: 100001, number: 4 },
          { id: 100002, number: 2 },
          { id: 100003, number: 0 },
        ],
      } as ApiDeck),
      currentDeck: () => ({ library: [{ id: 100001, number: 6 }] }),
      libraryQuery: { getEntity: (id: number) => ({ name: String(id) }) },
    }
    const changes = DeckComparisonComponent.prototype.calculateDiffs.call(
      context as unknown as DeckComparisonComponent,
      false,
    )
    expect(
      changes.map(
        ({ id, comparisonQuantity, currentQuantity, difference }) => ({
          id,
          comparisonQuantity,
          currentQuantity,
          difference,
        }),
      ),
    ).toEqual([
      { id: 100001, comparisonQuantity: 4, currentQuantity: 6, difference: 2 },
      { id: 100002, comparisonQuantity: 2, currentQuantity: 0, difference: -2 },
    ])
    context.comparisonDeck.set(null as unknown as ApiDeck)
    expect(
      DeckComparisonComponent.prototype.calculateDiffs.call(
        context as unknown as DeckComparisonComponent,
        false,
      ),
    ).toEqual([])
  })
})
