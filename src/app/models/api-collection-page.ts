import { ApiCollectionCard } from './api-collection-card'

export interface ApiCollectionPage {
  totalPages: number
  totalElements: number
  content?: ApiCollectionCard[]
}
