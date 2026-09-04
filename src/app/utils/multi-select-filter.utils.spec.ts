import { describe, expect, it } from 'vitest'
import { normalizeMultiSelectValues } from './multi-select-filter.utils'

describe('normalizeMultiSelectValues', () => {
  it('trims, deduplicates, and sorts ordinary values', () => {
    expect(normalizeMultiSelectValues([' prince ', 'baron', 'prince'])).toEqual(
      ['baron', 'prince'],
    )
  })

  it('keeps the first recognized exclusive value by configured priority', () => {
    expect(
      normalizeMultiSelectValues(['prince', 'none', 'any'], ['any', 'none']),
    ).toEqual(['any'])
    expect(normalizeMultiSelectValues(['prince', 'none'], ['none'])).toEqual([
      'none',
    ])
  })
})
