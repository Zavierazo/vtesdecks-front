import { ApiI18n } from './api-i18n'

export type CryptSortBy = keyof ApiCrypt | 'relevance' | 'trigramSimilarity'

export interface ApiCrypt {
  id: number
  name: string
  aka?: string
  type: string
  clan: string
  path?: string
  adv: boolean
  group: number
  capacity: number
  text: string
  sets: string[]
  title?: string
  banned?: string
  artist: string
  image: string
  cropImage: string
  clanIcon: string
  pathIcon?: string
  disciplines: string[]
  superiorDisciplines: string[]
  disciplineIcons: string[]
  sect: string
  taints: string[]
  deckPopularity: number
  cardPopularity: number
  i18n?: ApiI18n
  printOnDemand?: boolean
  unreleased?: boolean
  minPrice?: number
  limitedFormats?: number[]
  lastUpdate: Date
}
