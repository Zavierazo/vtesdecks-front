export interface ApiShoppingCard {
  id: number
  number: number
}

export interface ApiShoppingOptimizeRequest {
  cards: ApiShoppingCard[]
}

export interface ApiShoppingPreconDeck {
  deckId: string
  name: string
  set: string
  number: number
  unitPrice: number
  totalPrice: number
  coveredCards: ApiShoppingCard[]
}

export interface ApiShoppingSingleCard {
  id: number
  number: number
  // Absent when the card has no known shop price
  unitPrice?: number
  totalPrice?: number
}

export interface ApiShoppingOptimizeResponse {
  preconDecks: ApiShoppingPreconDeck[]
  singleCards: ApiShoppingSingleCard[]
  totalPrice: number
  singlesOnlyPrice: number
  currency: string
}
