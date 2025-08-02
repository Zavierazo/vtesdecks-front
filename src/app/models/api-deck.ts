import { ApiCard } from './api-card'
import { ApiDeckExtra } from './api-deck-extra'
import { ApiDeckStats } from './api-deck-stats'
import { ApiErrata } from './api-errata'

export interface ApiDeck {
  id: string
  type: string
  name: string
  views: number
  viewsLastMonth: number
  rate?: number
  votes: number
  comments: number
  tournament: string
  players: number
  year: number
  author: string
  url?: string
  source?: string
  description?: string
  set?: string
  limitedFormat?: string
  published?: boolean
  collection: boolean
  crypt?: ApiCard[]
  library?: ApiCard[]
  filterCards?: ApiCard[]
  clanIcons: string[]
  disciplineIcons: string[]
  stats: ApiDeckStats
  favorite?: boolean
  rated?: boolean
  owner?: boolean
  erratas?: ApiErrata[]
  tags?: string[]
  creationDate: Date
  modifyDate: Date
  extra?: ApiDeckExtra
}
