import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface LibraryFilter {
  printOnDemand?: boolean
  limitedFormat?: boolean
  customLimitedFormat?: ApiDeckLimitedFormat
  name?: string
  types?: string[]
  clans?: string[]
  disciplines?: string[]
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
