import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export const CRYPT_VOTES_RANGE = [0, 4] as const

export interface CryptFilter {
  printOnDemand?: boolean
  shops?: string[]
  notShops?: string[]
  limitedFormat?: boolean
  customLimitedFormat?: ApiDeckLimitedFormat
  name?: string
  clans?: string[]
  notClans?: string[]
  disciplines?: string[]
  superiorDisciplines?: string[]
  notDisciplines?: string[]
  disciplineMode?: 'and' | 'or'
  groupSlider?: number[]
  advanced?: 'base' | 'advanced'
  capacitySlider?: number[]
  votesSlider?: number[]
  titles?: string[]
  sects?: string[]
  paths?: string[]
  notPaths?: string[]
  sets?: string[]
  notSets?: string[]
  taints?: string[]
  cardText?: string
  artist?: string
  predefinedLimitedFormat?: string
}
