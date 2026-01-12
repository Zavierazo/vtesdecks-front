import { ApiCrypt } from './api-crypt'
import { ApiDeck } from './api-deck'
import { ApiLibrary } from './api-library'
import { ApiPublicUser } from './api-public-user'

export interface ApiSearchResponse {
  cards: (ApiCrypt | ApiLibrary)[]
  decks: ApiDeck[]
  users: ApiPublicUser[]
}
