import { ApiI18n } from './api-i18n'

export type LibrarySortBy = keyof ApiLibrary | 'relevance' | 'trigramSimilarity'

export interface ApiLibrary {
  id: number
  name: string
  aka?: string
  type: string
  clans: string[]
  path?: string
  poolCost: number
  bloodCost: number
  convictionCost: number
  burn: boolean
  text: string
  flavor: string
  sets: string[]
  requirement: string
  banned?: string
  artist: string
  capacity?: string
  image: string
  cropImage: string
  trifle: boolean
  disciplines: string[]
  types: string[]
  typeIcons: string[]
  clanIcons: string[]
  pathIcon?: string
  disciplineIcons: string[]
  sects: string[]
  titles: string[]
  taints: string[]
  deckPopularity: number
  cardPopularity: number
  i18n?: ApiI18n
  printOnDemand?: boolean
  unreleased?: boolean
  minPrice?: number
  lastUpdate: Date
}
