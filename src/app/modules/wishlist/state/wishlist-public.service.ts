import { inject, Injectable } from '@angular/core'
import { ApiWishlistPage } from '@models'
import { finalize, Observable, tap } from 'rxjs'
import { WishlistApiDataService } from '../services/wishlist-api.data.service'
import { WishlistService } from './wishlist.service'
import { WishlistQueryState } from './wishlist.store'

@Injectable({
  providedIn: 'root',
})
export class WishlistPublicService extends WishlistService {
  private readonly wishlistApiDataService = inject(WishlistApiDataService)

  private username?: string

  initialize(username: string): void {
    this.wishlistStore.reset()
    this.username = username
  }

  fetchCards(): Observable<ApiWishlistPage | null> {
    const query = this.wishlistStore.getValue().query
    this.wishlistStore.setLoading(true)
    return this.wishlistApiDataService
      .getUserPublicWishlist(this.username ?? '', query)
      .pipe(
        tap((data) => {
          // A null/empty body means the user does not exist or the wishlist is
          // private; the component renders the unavailable state in that case.
          this.wishlistStore.update((state) => ({
            ...state,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements ?? 0,
          }))
          this.wishlistStore.setEntities(data?.content)
        }),
        finalize(() => this.wishlistStore.setLoading(false)),
      )
  }

  getCards(query: WishlistQueryState): Observable<ApiWishlistPage | null> {
    return this.wishlistApiDataService.getUserPublicWishlist(
      this.username ?? '',
      query,
    )
  }
}
