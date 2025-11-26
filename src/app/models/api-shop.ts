import { ApiShopInfo } from './api-shop-info'

export interface ApiShop {
  cardId: number
  shopInfo: ApiShopInfo
  set: string
  link: string
  price: number
  currency: string
  inStock: boolean
  stockQuantity?: number
}
