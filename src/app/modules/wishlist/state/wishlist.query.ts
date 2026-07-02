import { inject, Injectable } from '@angular/core'
import { ApiWishlistCard } from '@models'
import { Observable } from 'rxjs'
import { WishlistQueryState, WishlistStore } from './wishlist.store'

@Injectable({
  providedIn: 'root',
})
export class WishlistQuery {
  private readonly store = inject(WishlistStore)

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectLoadingBackground(): Observable<boolean> {
    return this.store.selectLoadingBackground()
  }

  selectAll(): Observable<ApiWishlistCard[]> {
    return this.store.selectEntities()
  }

  selectTotalElements(): Observable<number> {
    return this.store.select((state) => state.totalElements ?? 0)
  }

  selectTotalPages(): Observable<number> {
    return this.store.select((state) => state.totalPages ?? 0)
  }

  selectQuery(): Observable<WishlistQueryState> {
    return this.store.select((state) => state.query)
  }

  selectFilter(filter: string): Observable<string | undefined> {
    return this.store.select(
      (state) => state.query.filters.find((f) => f[0] === filter)?.[1],
    )
  }

  selectPublicVisibility(): Observable<boolean> {
    return this.store.select((state) => state.publicVisibility ?? true)
  }

  getPublicVisibility(): boolean {
    return this.store.getValue().publicVisibility ?? true
  }

  getQuery(): WishlistQueryState {
    return this.store.getValue().query
  }

  getAll(): ApiWishlistCard[] {
    return this.store.getEntities()
  }
}
