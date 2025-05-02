import { ApiI18n } from './api-i18n'

export type LibrarySortBy = keyof ApiLibrary | 'relevance'

export interface ApiLibrary {
  id: number
  name: string
  aka: string
  type: string
  clans: string[]
  clanIcons: string[]
  poolCost: number
  bloodCost: number
  convictionCost: number
  burn: boolean
  flavor: string
  sets: string[]
  requirement: string
  banned: string
  artist: string
  capacity: string
  image: string
  cropImage: string
  trifle: boolean
  disciplines: string[]
  typeIcons: string[]
  disciplineIcons: string[]
  sects: string[]
  titles: string[]
  taints: string[]
  deckPopularity: number
  cardPopularity: number
  i18n: ApiI18n
  printOnDemand: boolean
  lastUpdate: Date
}
