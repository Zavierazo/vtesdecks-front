export interface ApiDeckArchetype {
  id: number
  name: string
  icon?: string
  type: string
  description?: string
  deckId: string
  enabled: boolean
  creationDate: Date
  modificationDate: Date
}
