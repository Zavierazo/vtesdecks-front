import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { CollectionQueryState, CollectionStore } from './collection.store'

@Injectable({
  providedIn: 'root',
})
export class CollectionQuery {
  private readonly store = inject(CollectionStore)

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectLoadingBackground(): Observable<boolean> {
    return this.store.selectLoadingBackground()
  }

  selectAll(): Observable<ApiCollectionCard[]> {
    return this.store.selectEntities()
  }

  selectBinders(): Observable<ApiCollectionBinder[]> {
    return this.store.select((state) => state.binders ?? [])
  }

  selectBinder(binderId?: number): Observable<ApiCollectionBinder | undefined> {
    return this.store.select((state) =>
      state.binders?.find((binder) => binder.id === binderId),
    )
  }

  selectTotalElements(): Observable<number> {
    return this.store.select((state) => state.totalElements ?? 0)
  }

  selectTotalPages(): Observable<number> {
    return this.store.select((state) => state.totalPages ?? 0)
  }

  selectQuery(): Observable<CollectionQueryState> {
    return this.store.select((state) => state.query)
  }

  selectFilter(filter: string): Observable<string | undefined> {
    return this.store.select(
      (state) => state.query.filters.find((f) => f[0] === filter)?.[1],
    )
  }
}
