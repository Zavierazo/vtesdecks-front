import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { ApiWishlistCard, ApiWishlistPage } from '@models'
import { Observable } from 'rxjs'
import { environment } from '@environments/environment'
import { WishlistQueryState } from '../state/wishlist.store'

@Injectable({
  providedIn: 'root',
})
export class WishlistApiDataService {
  private readonly httpClient = inject(HttpClient)

  private static readonly wishlistPath = '/user/wishlist'
  private static readonly publicCollectionsPath = '/collections'

  getCards(query: WishlistQueryState): Observable<ApiWishlistPage> {
    return this.httpClient.post<ApiWishlistPage>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/cards/search`,
      this.buildSearchBody(query),
    )
  }

  addCard(card: ApiWishlistCard): Observable<ApiWishlistCard> {
    return this.httpClient.post<ApiWishlistCard>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/cards`,
      card,
    )
  }

  addCardsBulk(cards: ApiWishlistCard[]): Observable<ApiWishlistCard[]> {
    return this.httpClient.post<ApiWishlistCard[]>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/cards/bulk`,
      cards,
    )
  }

  updateCard(card: ApiWishlistCard): Observable<ApiWishlistCard> {
    return this.httpClient.put<ApiWishlistCard>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/cards/${card.id}`,
      card,
    )
  }

  deleteCard(id: number): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/cards/${id}`,
    )
  }

  setVisibility(publicVisibility: boolean): Observable<boolean> {
    return this.httpClient.put<boolean>(
      `${environment.api.baseUrl}${WishlistApiDataService.wishlistPath}/visibility?publicVisibility=${publicVisibility}`,
      {},
    )
  }

  // PUBLIC WISHLIST

  getUserPublicWishlist(
    username: string,
    query: WishlistQueryState,
  ): Observable<ApiWishlistPage | null> {
    return this.httpClient.post<ApiWishlistPage | null>(
      `${environment.api.baseUrl}${WishlistApiDataService.publicCollectionsPath}/users/${username}/wishlist/search`,
      this.buildSearchBody(query),
    )
  }

  // COMMON METHODS

  private buildSearchBody(query: WishlistQueryState) {
    return {
      page: query.page,
      size: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      filters: Object.fromEntries(
        query.filters.filter(([, value]) => value !== undefined),
      ),
      cardIds: query.cardIds,
    }
  }
}
