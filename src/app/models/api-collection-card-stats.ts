import { ApiCollectionCard } from './api-collection-card'
import { ApiDecks } from './api-decks'

export interface ApiCollectionCardStats {
  collectionNumber: number
  collectionCards: ApiCollectionCard[]
  decks: ApiDecks
}
