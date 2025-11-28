import { ApiDeckAdvent } from './api-deck-advent'
import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface ApiDeckExtra {
  limitedFormat?: ApiDeckLimitedFormat
  advent?: ApiDeckAdvent
}
