import { ApiSet } from './api-set'

export const FILTER_SET = 'set'
export const FILTER_CARD_TYPE = 'cardType'
export const FILTER_BINDER = 'binderId'
export const FILTER_CARD_ID = 'cardId'
export const FILTER_CARD_NAME = 'cardName'

export interface ApiCollectionCard {
  id?: number
  cardId: number
  cardName?: string
  set?: ApiSet
  setId?: number
  number: number
  binderId?: number
  condition?: 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO'
  language?: string
  price?: number
  currency?: string
  fullArt?: boolean
  notes?: string
  creationDate?: Date
  modificationDate?: Date
}
