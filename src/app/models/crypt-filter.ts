import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface CryptFilter {
  printOnDemand?: boolean
  shop?: string
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
  title?: string
  sect?: string
  paths?: string[]
  notPaths?: string[]
  set?: string
  taints?: string[]
  cardText?: string
  artist?: string
  predefinedLimitedFormat?: string
}
