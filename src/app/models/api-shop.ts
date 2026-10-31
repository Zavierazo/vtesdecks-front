import { ApiShopInfo } from './api-shop-info'

export interface ApiShop {
  cardId: number
  shopInfo: ApiShopInfo
  set?: string
  locale?: string
  country?: string
  continent?: string
  seller?: string
  link: string
  price: number
  currency: string
  inStock: boolean
  stockQuantity?: number
}
