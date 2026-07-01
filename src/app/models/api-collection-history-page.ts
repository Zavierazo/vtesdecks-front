import { ApiCollectionHistoryItem } from './api-collection-history-item'

export interface ApiCollectionHistoryPage {
  totalPages: number
  totalElements: number
  content?: ApiCollectionHistoryItem[]
}
