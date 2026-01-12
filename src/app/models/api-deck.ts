import { ApiCard } from './api-card'
import { ApiDeckExtra } from './api-deck-extra'
import { ApiDeckStats } from './api-deck-stats'
import { ApiDeckWarning } from './api-deck-warning'
import { ApiCardErrata } from './api-errata'
import { ApiPublicUser } from './api-public-user'

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
  user?: ApiPublicUser
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
  pathIcon?: string
  stats: ApiDeckStats
  favorite?: boolean
  rated?: boolean
  owner?: boolean
  erratas?: ApiCardErrata[]
  warnings?: ApiDeckWarning[]
  tags?: string[]
  creationDate: Date
  modifyDate: Date
  extra?: ApiDeckExtra
}
