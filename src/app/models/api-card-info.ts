import { ApiCollectionCardStats } from './api-collection-card-stats'
import { ApiDeck } from './api-deck'
import { ApiCardErrata } from './api-errata'
import { ApiRuling } from './api-ruling'
import { ApiShop } from './api-shop'

export interface ApiCardInfo {
  preconstructedDecks: ApiDeck[]
  shopList: ApiShop[]
  hasMoreShops: boolean
  rulingList?: ApiRuling[]
  errataList?: ApiCardErrata[]
  collectionStats?: ApiCollectionCardStats
  minPrice?: number
  maxPrice?: number
  currency?: string
}
