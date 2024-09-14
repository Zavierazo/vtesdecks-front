import { ApiCard } from './api-card'

export interface ApiDeckBuilder {
  id?: string
  name?: string
  description?: string
  published?: boolean
  cards?: ApiCard[]
}
