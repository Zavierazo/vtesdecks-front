import { inject, Injectable } from '@angular/core'
import { finalize, Observable, tap } from 'rxjs'
import { ApiCollection } from '../../../models/api-collection'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { ApiCollectionPage } from '../../../models/api-collection-page'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionService } from './collection.service'

@Injectable({
  providedIn: 'root',
})
export class CollectionPrivateService extends CollectionService {
  private readonly collectionApiDataService = inject(CollectionApiDataService)

  initialize(binderId?: number): Observable<ApiCollection> {
    this.collectionStore.setLoading(true)
    if (binderId) {
      this.setFilter('binderId', binderId)
    }
    return this.collectionApiDataService.getCollection().pipe(
      tap((data) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: data.binders,
          creationDate: data.creationDate,
          modificationDate: data.modificationDate,
        }))
      }),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  fetchCards(): Observable<ApiCollectionPage> {
    const query = this.collectionStore.getValue().query
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.getCards(query).pipe(
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

  addBinder(binder: ApiCollectionBinder): Observable<ApiCollectionBinder> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.addBinder(binder).pipe(
      tap((newBinder) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [...(state.binders ?? []), newBinder],
        }))
      }),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  updateBinder(
    id: number,
    binder: ApiCollectionBinder,
  ): Observable<ApiCollectionBinder> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.updateBinder(id, binder).pipe(
      tap((newBinder) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [
            ...(state.binders?.map((b) => (b.id === id ? newBinder : b)) ?? []),
          ],
        }))
      }),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  deleteBinder(id: number, deleteCards: boolean): Observable<boolean> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.deleteBinder(id, deleteCards).pipe(
      tap(() => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: state.binders?.filter((b) => b.id !== id),
        }))
      }),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  addCard(card: ApiCollectionCard): Observable<ApiCollectionCard> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.addCard(card).pipe(
      tap((newCard) => this.collectionStore.addEntity(newCard)),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }

  updateCard(card: ApiCollectionCard): Observable<ApiCollectionCard> {
    this.collectionStore.setLoading(true)
    return this.collectionApiDataService.updateCard(card).pipe(
      tap((updatedCard) => this.collectionStore.updateEntity(updatedCard)),
      finalize(() => this.collectionStore.setLoading(false)),
    )
  }
}
