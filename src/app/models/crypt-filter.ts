import { ApiDeckLimitedFormat } from './api-deck-limited-format'

export interface CryptFilter {
  printOnDemand?: boolean
  limitedFormat?: boolean
  customLimitedFormat?: ApiDeckLimitedFormat
  name?: string
  clans?: string[]
  disciplines?: string[]
  superiorDisciplines?: string[]
  groupSlider?: number[]
  capacitySlider?: number[]
  title?: string
  sect?: string
  path?: string
  set?: string
  taints?: string[]
  cardText?: string
  artist?: string
  predefinedLimitedFormat?: string
}
