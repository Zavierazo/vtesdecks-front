import { ApiDeck } from '@models'

export interface FinalTableSeat {
  number?: number
  deck?: ApiDeck
}

const compareFinalTableDecks = (first: ApiDeck, second: ApiDeck): number => {
  const firstSeat = first.finalSeat ?? Number.MAX_SAFE_INTEGER
  const secondSeat = second.finalSeat ?? Number.MAX_SAFE_INTEGER
  if (firstSeat !== secondSeat) {
    return firstSeat - secondSeat
  }
  return first.name.localeCompare(second.name)
}

export const buildFinalTableSeats = (decks: ApiDeck[]): FinalTableSeat[] => {
  const finalists = [...decks].sort(compareFinalTableDecks)
  const seats: FinalTableSeat[] = Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    deck: finalists.find((deck) => deck.finalSeat === index + 1),
  }))
  // Never invent seating for missing, invalid, or duplicate seat data.
  const placed = new Set(seats.map((seat) => seat.deck))
  return [
    ...seats,
    ...finalists.filter((deck) => !placed.has(deck)).map((deck) => ({ deck })),
  ]
}
