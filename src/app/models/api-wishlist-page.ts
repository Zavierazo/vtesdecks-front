import { ApiWishlistCard } from './api-wishlist-card'

export interface ApiWishlistPage {
  totalPages: number
  totalElements: number
  // The owner's current wishlist visibility. Only present on the authenticated
  // /user/wishlist/cards response; absent on the public endpoint.
  publicVisibility?: boolean
  content?: ApiWishlistCard[]
}
