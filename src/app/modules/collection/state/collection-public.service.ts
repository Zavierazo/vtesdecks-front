import { inject, Injectable } from '@angular/core'
import { ApiCollectionBinder, ApiCollectionPage } from '@models'
import { EMPTY, filter, finalize, Observable, tap } from 'rxjs'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionService } from './collection.service'
import { CollectionQueryState } from './collection.store'
@Injectable({
  providedIn: 'root',
})
export class CollectionPublicService extends CollectionService {
  private readonly collectionApiDataService = inject(CollectionApiDataService)

  initialize(publicHash: string): Observable<ApiCollectionBinder> {
    const context = this.getContext(publicHash)
    this.collectionStore.reset(context)
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.getPublicBinder(publicHash).pipe(
      filter(() => this.collectionStore.isContext(context)),
      tap((data) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [data],
          creationDate: data.creationDate,
          modificationDate: data.modificationDate,
        }))
      }),
      finalize(() => {
        if (this.collectionStore.isContext(context)) {
          this.collectionStore.setLoading(false)
        }
      }),
    )
  }

  fetchCards(): Observable<ApiCollectionPage> {
    const { binders, query } = this.collectionStore.getValue()
    if (!binders || binders.length === 0) {
      return EMPTY
    }
    const context = this.getContext(binders[0].publicHash!)
    if (!this.collectionStore.isContext(context)) {
      return EMPTY
    }
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService
      .getPublicBinderCards(binders[0].publicHash!, query)
      .pipe(
        filter(() => this.collectionStore.isContext(context)),
        tap((data) => {
          this.collectionStore.update((state) => ({
            ...state,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
          }))
          this.collectionStore.setEntities(data.content)
        }),
        finalize(() => {
          if (this.collectionStore.isContext(context)) {
            this.collectionStore.setLoading(false)
          }
        }),
      )
  }

  getCards(query: CollectionQueryState): Observable<ApiCollectionPage> {
    const { binders } = this.collectionStore.getValue()
    if (!binders || binders.length === 0) {
      return EMPTY
    }
    const context = this.getContext(binders[0].publicHash!)
    if (!this.collectionStore.isContext(context)) {
      return EMPTY
    }
    return this.collectionApiDataService
      .getPublicBinderCards(binders[0].publicHash!, query)
      .pipe(filter(() => this.collectionStore.isContext(context)))
  }

  private getContext(publicHash: string): string {
    return `public:${publicHash}`
  }
}
