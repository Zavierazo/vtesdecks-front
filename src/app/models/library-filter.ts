import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface LibraryFilter {
  printOnDemand?: boolean
  shops?: string[]
  notShops?: string[]
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
  paths?: string[]
  notPaths?: string[]
  bloodCostSlider?: number[]
  poolCostSlider?: number[]
  convictionCostSlider?: number[]
  trifle?: 'trifle' | 'non_trifle'
  title?: string
  sets?: string[]
  notSets?: string[]
  taints?: string[]
  cardText?: string
  artist?: string
  predefinedLimitedFormat?: string
}
