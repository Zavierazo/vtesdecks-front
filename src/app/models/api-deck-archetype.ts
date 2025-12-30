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
  creationDate: Date
  modificationDate: Date
}
