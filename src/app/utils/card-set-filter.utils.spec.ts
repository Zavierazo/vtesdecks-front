import { describe, expect, it } from 'vitest'
import {
  matchesSetSelection,
  normalizeSetSelection,
} from './card-set-filter.utils'

describe('normalizeSetSelection', () => {
  it('trims and deduplicates values and lets exclusions win', () => {
    expect(
      normalizeSetSelection(['KoT', ' HttB ', 'KoT'], ['HttB', ' Anarchs ']),
    ).toEqual({ sets: ['KoT'], notSets: ['Anarchs', 'HttB'] })
  })
})

describe('matchesSetSelection', () => {
  const cardSets = ['KoT:U', 'HttB:R']

  it('matches any included set', () => {
    expect(matchesSetSelection(cardSets, ['KoT', 'Anarchs'])).toBe(true)
    expect(matchesSetSelection(cardSets, ['Anarchs', 'Sabbat'])).toBe(false)
  })

  it('supports exclusions without inclusions', () => {
    expect(matchesSetSelection(cardSets, [], ['Anarchs'])).toBe(true)
    expect(matchesSetSelection(cardSets, [], ['HttB'])).toBe(false)
  })

  it('lets exclusions take precedence over inclusions', () => {
    expect(matchesSetSelection(cardSets, ['KoT'], ['KoT'])).toBe(false)
    expect(matchesSetSelection(cardSets, ['KoT'], ['HttB'])).toBe(false)
  })
})
