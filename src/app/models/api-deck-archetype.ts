export interface ApiDeckArchetype {
  id: number
  name: string
  icon?: string
  type: string
  description?: string
  deckId: string
  enabled: boolean
  deckCount: number
  metaCount: number
  metaTotal: number
  price?: number
  currency?: string
  creationDate: Date
  modificationDate: Date
}
