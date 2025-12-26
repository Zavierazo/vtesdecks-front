import { ApiCollectionSectionStats } from './api-collection-section-stats'

export interface ApiCollectionStats {
  overall: ApiCollectionSectionStats
  crypt: ApiCollectionSectionStats
  library: ApiCollectionSectionStats
  clans: Map<string, ApiCollectionSectionStats>
  types: Map<string, ApiCollectionSectionStats>
  sets: Map<string, ApiCollectionSectionStats>
  currency: string
}
