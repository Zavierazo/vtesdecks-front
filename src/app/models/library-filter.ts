import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface LibraryFilter {
  printOnDemand?: boolean
  limitedFormat?: boolean
  customLimitedFormat?: ApiDeckLimitedFormat
  name?: string
  types?: string[]
  notTypes?: string[]
  typeMode?: 'and' | 'or'
  clans?: string[]
  notClans?: string[]
  disciplines?: string[]
  notDisciplines?: string[]
  disciplineMode?: 'and' | 'or'
  sect?: string
  path?: string
  bloodCostSlider?: number[]
  poolCostSlider?: number[]
  title?: string
  set?: string
  taints?: string[]
  cardText?: string
  artist?: string
  predefinedLimitedFormat?: string
}
