import { inject, Injectable } from '@angular/core'
import {
  ApiCollectionCard,
  ApiCollectionPage,
  FILTER_BINDER,
  FILTER_CARD_ID,
  FILTER_SET,
} from '@models'
import { EMPTY, finalize, Observable, tap } from 'rxjs'
import { CollectionQueryState, CollectionStore } from './collection.store'

@Injectable({
  providedIn: 'root',
})
export abstract class CollectionService {
  protected readonly collectionStore = inject(CollectionStore)

  reset() {
    this.collectionStore.reset()
  }

  abstract fetchCards(): Observable<ApiCollectionPage>

  abstract getCards(query: CollectionQueryState): Observable<ApiCollectionPage>

  setPageSize(size: number): void {
    this.collectionStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing page size
      pageSize: size,
    }))
  }

  setSortBy(
    sortBy: keyof ApiCollectionCard,
    sortDirection: 'asc' | 'desc' | '',
  ): void {
    this.collectionStore.updateQuery((query) => ({
      ...query,
      page: 0, // Reset to first page when changing sort
      sortBy,
      sortDirection,
    }))
  }

  setPage(page: number): void {
    this.collectionStore.updateQuery((query) => ({
      ...query,
      page,
    }))
  }

  setFilter(
    filterBy: string,
    filterValue?: string | number | boolean | number[],
  ): void {
    if (filterValue !== undefined) {
      this.collectionStore.updateQuery((query) => ({
        ...query,
        page: 0, // Reset to first page when changing filters
        filters: [
          ...query.filters.filter((filter) => filter[0] !== filterBy),
          [filterBy, filterValue],
        ],
      }))
    } else {
      this.collectionStore.updateQuery((query) => ({
        ...query,
        page: 0, // Reset to first page when changing filters
        filters: [...query.filters.filter((filter) => filter[0] !== filterBy)],
      }))
    }
  }

  toggleGroupCard(card: ApiCollectionCard): Observable<ApiCollectionPage> {
    if (card.groupItems) {
      this.collectionStore.updateGroupItems(card, undefined)
      return EMPTY
    } else {
      const groupBy = this.collectionStore.getGroupBy()
      const filters: [
        string,
        string | number | boolean | number[] | undefined,
      ][] = []
      const existingBinderFilter = this.collectionStore
        .getValue()
        .query.filters?.find((f) => f[0] === FILTER_BINDER)
      switch (groupBy) {
        case 'binderId':
          filters.push([FILTER_BINDER, card.binderId ?? 0])
          break
        case 'set':
          filters.push([FILTER_SET, card.set ?? 'none'])
          break
      }
      if (groupBy !== 'binderId' && existingBinderFilter) {
        filters.push(existingBinderFilter)
      }
      filters.push([FILTER_CARD_ID, card.cardId])
      this.collectionStore.setLoading(true)
      return this.getCards({
        page: 0,
        pageSize: 100,
        sortBy: 'number',
        sortDirection: 'desc',
        filters,
      }).pipe(
        tap((data) =>
          this.collectionStore.updateGroupItems(card, data.content),
        ),
        finalize(() => this.collectionStore.setLoading(false)),
      )
    }
  }
}
