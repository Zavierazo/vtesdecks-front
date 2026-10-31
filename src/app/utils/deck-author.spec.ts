import { ApiDeck, ApiPublicUser } from '@models'
import { describe, expect, it } from 'vitest'
import { deckAuthorName } from './deck-author'

describe('Verified tournament attribution', () => {
  const player: ApiPublicUser = {
    user: 'player',
    displayName: 'Website name',
    profileImage: '',
    roles: [],
    followers: [],
    following: [],
  }
  const deck = {
    type: 'TOURNAMENT',
    author: 'Archive player',
    owner: false,
    user: player,
  } as ApiDeck
  it('uses the verified public identity without changing ownership or archive author', () => {
    expect(deckAuthorName(deck)).toBe('Website name')
    expect(deck.owner).toBe(false)
    expect(deck.user).toBe(player)
    expect(deck.author).toBe('Archive player')
  })
  it('restores original attribution without a connection and ignores it on other deck types', () => {
    expect(deckAuthorName({ ...deck, user: undefined })).toBe('Archive player')
    expect(deckAuthorName({ ...deck, type: 'COMMUNITY' })).toBe(
      'Archive player',
    )
    expect(deckAuthorName({ ...deck, type: 'SNAPSHOT' })).toBe('Archive player')
  })
  it('falls back to the linked username when its display name is empty', () => {
    expect(
      deckAuthorName({ ...deck, user: { ...player, displayName: '' } }),
    ).toBe('player')
  })
})
