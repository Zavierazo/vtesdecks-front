import { inject, Injectable } from '@angular/core'
import { finalize, Observable, tap } from 'rxjs'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionPage } from '../../../models/api-collection-page'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionService } from './collection.service'
@Injectable({
  providedIn: 'root',
})
export class CollectionPublicService extends CollectionService {
  private readonly collectionApiDataService = inject(CollectionApiDataService)

  initialize(publicHash: string): Observable<ApiCollectionBinder> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.getPublicBinder(publicHash).pipe(
      tap((data) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [data],
          creationDate: data.creationDate,
          modificationDate: data.modificationDate,
        }))
      }),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  fetchCards(): Observable<ApiCollectionPage> {
    const { binders, query } = this.collectionStore.getValue()
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService
      .getPublicBinderCards(binders![0].publicHash!, query)
      .pipe(
        tap((data) => {
          this.collectionStore.update((state) => ({
            ...state,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
          }))
          this.collectionStore.setEntities(data.content)
        }),
        finalize(() => this.collectionStore.setLoading(false)),
      )
  }
}
