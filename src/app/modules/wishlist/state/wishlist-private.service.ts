import { inject, Injectable } from '@angular/core'
import { ApiWishlistCard, ApiWishlistPage } from '@models'
import { finalize, forkJoin, Observable, of, tap } from 'rxjs'
import { WishlistApiDataService } from '../services/wishlist-api.data.service'
import { WishlistService } from './wishlist.service'
import { WishlistQueryState } from './wishlist.store'

@Injectable({
  providedIn: 'root',
})
export class WishlistPrivateService extends WishlistService {
  private readonly wishlistApiDataService = inject(WishlistApiDataService)

  initialize(): void {
    this.wishlistStore.reset()
  }

  fetchCards(): Observable<ApiWishlistPage> {
    const query = this.wishlistStore.getValue().query
    this.wishlistStore.setLoading(true)
    return this.wishlistApiDataService.getCards(query).pipe(
      tap((data) => {
        this.wishlistStore.update((state) => ({
          ...state,
          totalPages: data.totalPages,
          totalElements: data.totalElements,
          // Backend exposes the current visibility on the cards response; keep
          // the existing value if the field is not (yet) provided.
          publicVisibility: data.publicVisibility ?? state.publicVisibility,
        }))
        this.wishlistStore.setEntities(data.content)
      }),
      finalize(() => this.wishlistStore.setLoading(false)),
    )
  }

  getCards(query: WishlistQueryState): Observable<ApiWishlistPage> {
    return this.wishlistApiDataService.getCards(query)
  }

  addCard(card: ApiWishlistCard): Observable<ApiWishlistCard> {
    this.wishlistStore.setLoadingBackground(true)
    // The backend deduplicates by (cardId, set, condition, language): if a
    // matching entry exists its quantity is incremented and the resulting card
    // is returned with its existing id. Upserting by id covers both cases.
    return this.wishlistApiDataService.addCard(card).pipe(
      tap((saved) => this.wishlistStore.addEntity(saved)),
      finalize(() => this.wishlistStore.setLoadingBackground(false)),
    )
  }

  updateCard(card: ApiWishlistCard): Observable<ApiWishlistCard> {
    this.wishlistStore.setLoadingBackground(true)
    return this.wishlistApiDataService.updateCard(card).pipe(
      tap((saved) => this.wishlistStore.updateEntity(saved)),
      finalize(() => this.wishlistStore.setLoadingBackground(false)),
    )
  }

  deleteCards(ids: number[]): Observable<boolean[]> {
    this.wishlistStore.setLoadingBackground(true)
    const requests = ids.map((id) =>
      this.wishlistApiDataService
        .deleteCard(id)
        .pipe(tap(() => this.wishlistStore.removeEntity(id))),
    )
    return (requests.length ? forkJoin(requests) : of([])).pipe(
      finalize(() => this.wishlistStore.setLoadingBackground(false)),
    )
  }

  setVisibility(publicVisibility: boolean): Observable<boolean> {
    this.wishlistStore.setLoadingBackground(true)
    return this.wishlistApiDataService.setVisibility(publicVisibility).pipe(
      tap((value) =>
        this.wishlistStore.update((state) => ({
          ...state,
          publicVisibility: value,
        })),
      ),
      finalize(() => this.wishlistStore.setLoadingBackground(false)),
    )
  }
}
