import { ApiDeck } from "./api-deck";

export interface ApiDecks {
  offset: number;
  total: number;
  decks: ApiDeck[];
}
