import { describe, expect, it } from 'vitest'
import { validCustomDeckTag, validCustomDeckTags } from './custom-deck-tags'

describe('Custom deck tag validation', () => {
  it.each(['', 'ABC', 'a b', 'a,b', 'a-b', 'á', '🎲', 'abcdefghijk', 'abc\n'])(
    'rejects %j',
    (tag) => {
      expect(validCustomDeckTag(tag)).toBe(false)
    },
  )
  it('accepts the boundaries, unique values and clearing', () => {
    expect(validCustomDeckTags(['a', '0123456789', 'tourney1'])).toBe(true)
    expect(validCustomDeckTags([])).toBe(true)
    expect(validCustomDeckTags(['a', 'a'])).toBe(false)
    expect(validCustomDeckTags(['a', 'b', 'c', 'd'])).toBe(false)
  })
})
