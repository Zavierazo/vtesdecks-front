import { ApiDeck } from './api-deck';

export interface ApiHome {
  preConstructedTotal: number;
  tournamentTotal: number;
  communityTotal: number;
  userTotal?: number;
  favoriteTotal?: number;
  tournamentPopular: ApiDeck[];
  tournamentNewest: ApiDeck[];
  communityPopular: ApiDeck[];
  communityNewest: ApiDeck[];
}
