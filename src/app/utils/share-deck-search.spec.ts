import { describe, expect, it } from 'vitest'
import { shareDeckSearch } from './share-deck-search'
import { buildSearchPath, normalizeSearchParams } from './search-query.utils'

describe('Shared My decks search', () => {
  it('pins the owner, preserves filters and does not mutate My decks', () => {
    const original = {
      type: 'USER',
      tags: 'stealth,league',
      order: 'MODIFIED',
      clans: 'tremere',
      favorite: 'true',
      collectionPercentage: '100',
      absoluteProportion: 'true',
      master: '1,5',
    }
    const shared = shareDeckSearch(
      normalizeSearchParams('decks', original),
      'owner',
    )
    const url = new URL(
      buildSearchPath('decks', shared.params),
      'https://vtesdecks.com',
    )
    expect(url.searchParams.get('username')).toBe('owner')
    expect(url.searchParams.get('type')).toBeNull()
    for (const key of [
      'tags',
      'order',
      'clans',
      'absoluteProportion',
      'master',
    ] as const) {
      expect(url.searchParams.get(key)).toBe(original[key])
    }
    expect(url.searchParams.has('favorite')).toBe(false)
    expect(url.searchParams.has('collectionPercentage')).toBe(false)
    expect(shared.omittedPersonal).toBe(true)
    expect(original.type).toBe('USER')
    expect(original.favorite).toBe('true')
    expect(
      normalizeSearchParams('decks', Object.fromEntries(url.searchParams)),
    ).toEqual(normalizeSearchParams('decks', shared.params))
  })
  it('does not replace the owner when re-sharing a public search', () => {
    const params = { username: 'owner', tags: 'league' }
    expect(shareDeckSearch(params, 'visitor')).toEqual({
      params,
      omittedPersonal: false,
    })
  })
  it('fails instead of sharing all decks when the account is unavailable', () => {
    expect(() => shareDeckSearch({ type: 'USER' })).toThrow()
  })
})
