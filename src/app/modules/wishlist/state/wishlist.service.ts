import { inject, Injectable } from '@angular/core'
import { ApiWishlistCard, ApiWishlistPage, FILTER_CARD_TYPE } from '@models'
import { Observable } from 'rxjs'
import { WishlistQueryState, WishlistStore } from './wishlist.store'

@Injectable({
  providedIn: 'root',
})
export abstract class WishlistService {
  protected readonly wishlistStore = inject(WishlistStore)

  reset() {
    this.wishlistStore.reset()
  }

  abstract fetchCards(): Observable<ApiWishlistPage | null>

  abstract getCards(
    query: WishlistQueryState,
  ): Observable<ApiWishlistPage | null>

  setPageSize(size: number): void {
    this.wishlistStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing page size
      pageSize: size,
    }))
  }

  setSortBy(
    sortBy: keyof ApiWishlistCard,
    sortDirection: 'asc' | 'desc' | '',
  ): void {
    this.wishlistStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing sort
      sortBy,
      sortDirection,
    }))
  }

  setPage(page: number): void {
    this.wishlistStore.updateQuery((query) => ({
      ...query,
      page,
    }))
  }

  setCardIds(cardIds?: number[]): void {
    this.wishlistStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing filters
      cardIds,
    }))
  }

  setCardTypeFilter(cardType?: string): void {
    this.wishlistStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing filters
      filters:
        cardType !== undefined
          ? [
              ...query.filters.filter((f) => f[0] !== FILTER_CARD_TYPE),
              [FILTER_CARD_TYPE, cardType],
            ]
          : query.filters.filter((f) => f[0] !== FILTER_CARD_TYPE),
      cardIds: undefined,
    }))
  }

  setFilter(
    filterBy: string,
    filterValue?: string | number | boolean | number[],
  ): void {
    if (filterValue !== undefined) {
      this.wishlistStore.updateQuery((query) => ({
        ...query,
        page: 0, // Reset to first page when changing filters
        filters: [
          ...query.filters.filter((filter) => filter[0] !== filterBy),
          [filterBy, filterValue],
        ],
      }))
    } else {
      this.wishlistStore.updateQuery((query) => ({
        ...query,
        page: 0, // Reset to first page when changing filters
        filters: [...query.filters.filter((filter) => filter[0] !== filterBy)],
      }))
    }
  }
}
