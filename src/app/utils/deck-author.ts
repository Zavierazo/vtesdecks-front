import { ApiDeck } from '@models'

export function deckAuthorName(deck: ApiDeck): string {
  if (deck.type === 'TOURNAMENT' && deck.user) {
    return deck.user.displayName || deck.user.user
  }
  return deck.author
}
