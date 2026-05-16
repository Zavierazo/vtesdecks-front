import { ApiArchetypeKeyCard } from './api-archetype-key-card'

export interface ApiSuggestedCardsResponse {
  keyCrypt?: ApiArchetypeKeyCard[]
  keyLibrary?: ApiArchetypeKeyCard[]
}
