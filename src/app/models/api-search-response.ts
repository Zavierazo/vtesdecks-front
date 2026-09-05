import { ApiCrypt } from './api-crypt'
import { ApiDeck } from './api-deck'
import { ApiLibrary } from './api-library'
import { ApiPublicUser } from './api-public-user'
import { ApiSearchArchetype } from './api-search-archetype'

export interface ApiSearchResponse {
  cards: (ApiCrypt | ApiLibrary)[]
  archetypes?: ApiSearchArchetype[]
  decks: ApiDeck[]
  users: ApiPublicUser[]
}
