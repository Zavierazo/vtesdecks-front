import { ApiCollectionCardStats } from './api-collection-card-stats'
import { ApiDeck } from './api-deck'
import { ApiRuling } from './api-ruling'
import { ApiShop } from './api-shop'

export interface ApiCardInfo {
  preconstructedDecks: ApiDeck[]
  shopList: ApiShop[]
  rulingList?: ApiRuling[]
  collectionStats?: ApiCollectionCardStats
}
