export const FILTER_SET = 'set'
export const FILTER_CARD_TYPE = 'cardType'
export const FILTER_BINDER = 'binderId'
export const FILTER_CARD_ID = 'cardId'
export const FILTER_CARD_NAME = 'cardName'
export const FILTER_GROUP_BY = 'groupBy'
export const FILTER_TYPES = 'cardTypes'
export const FILTER_CLANS = 'cardClans'
export const FILTER_DISCIPLINES = 'cardDisciplines'

export interface ApiCollectionCard {
  id?: number
  cardId: number
  cardName?: string
  set?: string
  number: number
  binderId?: number
  condition?: 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO'
  language?: string
  price?: number
  totalPrice?: number
  currency?: string
  notes?: string
  creationDate?: Date
  modificationDate?: Date
  groupItems?: ApiCollectionCard[]
}
