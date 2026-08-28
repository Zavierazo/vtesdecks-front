import { ApiDeck } from './api-deck'

export interface ApiHome {
  preConstructedTotal: number
  spoilerDecks?: ApiDeck[] | null
  tournamentTotal: number
  communityTotal: number
  userTotal?: number
  favoriteTotal?: number
  tournamentPopular: ApiDeck[]
  tournamentNewest: ApiDeck[]
  communityPopular: ApiDeck[]
  communityNewest: ApiDeck[]
}
