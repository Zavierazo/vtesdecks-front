import { ApiCard } from './api-card';
import { ApiDeckStats } from './api-deck-stats';
import { ApiErrata } from './api-errata';

export interface ApiDeck {
  id: string;
  type: string;
  name: string;
  views: number;
  viewsLastMonth: number;
  rate?: number;
  votes: number;
  comments: number;
  tournament: string;
  players: number;
  year: number;
  author: string;
  url?: string;
  source?: string;
  description?: string;
  published?: boolean;
  crypt?: ApiCard[];
  library?: ApiCard[];
  clanIcons: string[];
  disciplineIcons: string[];
  stats: ApiDeckStats;
  favorite?: boolean;
  rated?: boolean;
  owner?: boolean;
  erratas?: ApiErrata[];
  tags?: string[];
  creationDate: Date;
  modifyDate: Date;
}
