import { ApiDeck } from './api-deck'

export interface ApiDecks {
  offset: number
  total: number
  currency: string
  decks: ApiDeck[]
  restorableDecks: ApiDeck[]
}
