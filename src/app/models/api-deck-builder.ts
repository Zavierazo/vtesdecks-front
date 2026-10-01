import { ApiCard } from './api-card'
import { ApiDeckExtra } from './api-deck-extra'

export interface ApiDeckBuilder {
  id?: string
  name?: string
  customTags?: string[]
  description?: string
  published?: boolean
  collection?: boolean
  cards?: ApiCard[]
  extra?: ApiDeckExtra
  tagLabel?: string
}
