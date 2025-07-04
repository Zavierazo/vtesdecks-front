import { ApiSet } from './api-set'

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
