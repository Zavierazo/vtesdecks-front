import { ApiDeckLimitedFormatCard } from './api-deck-limited-format-card'
import { ApiDeckLimitedFormatFilter } from './api-deck-limited-format-filter'

export interface ApiDeckLimitedFormat {
  id?: number
  name?: string
  minLibrary?: number
  maxLibrary?: number
  minCrypt?: number
  maxCrypt?: number
  sets: ApiDeckLimitedFormatFilter
  allowed: ApiDeckLimitedFormatCard
  banned: ApiDeckLimitedFormatCard
}
