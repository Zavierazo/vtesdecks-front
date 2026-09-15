/** Public URL payload. Never serialize an ApiDeck or builder state directly. */
export interface DeckSnapshotV1 {
  name: string
  author: string
  description: string
  cards: [id: number, quantity: number][]
}
