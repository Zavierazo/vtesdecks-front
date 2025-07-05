import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { ApiCollectionPage } from '../../../models/api-collection-page'
import { CollectionStore } from './collection.store'

@Injectable({
  providedIn: 'root',
})
export abstract class CollectionService {
  protected readonly collectionStore = inject(CollectionStore)

  reset() {
    this.collectionStore.reset()
  }

  abstract fetchCards(): Observable<ApiCollectionPage>

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
}
