export const FILTER_PRIORITY = 'priority'

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ApiWishlistCard {
  id?: number
  cardId: number
  cardName?: string
  number: number
  priority?: WishlistPriority | null
  set?: string | null
  condition?: 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO' | null
  language?: string | null
  price?: number | null
  totalPrice?: number | null
  currency?: string | null
  notes?: string | null
  creationDate?: Date
  modificationDate?: Date
}
