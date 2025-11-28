import { HttpResponse } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import {
  ApiCollection,
  ApiCollectionBinder,
  ApiCollectionCard,
  ApiCollectionImport,
  ApiCollectionPage,
  FILTER_BINDER,
} from '@models'
import { finalize, map, Observable, switchMap, tap } from 'rxjs'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionService } from './collection.service'
import { CollectionQueryState } from './collection.store'

@Injectable({
  providedIn: 'root',
})
export class CollectionPrivateService extends CollectionService {
  private readonly collectionApiDataService = inject(CollectionApiDataService)

  initialize(binderId?: number): Observable<ApiCollection> {
    this.collectionStore.setLoading(true)
    if (binderId) {
      this.setFilter(FILTER_BINDER, binderId)
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

  getCards(query: CollectionQueryState): Observable<ApiCollectionPage> {
    return this.collectionApiDataService.getCards(query)
  }

  addBinder(binder: ApiCollectionBinder): Observable<ApiCollectionBinder> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.addBinder(binder).pipe(
      tap((newBinder) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [...(state.binders ?? []), newBinder],
        }))
      }),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  updateBinder(
    id: number,
    binder: ApiCollectionBinder,
  ): Observable<ApiCollectionBinder> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.updateBinder(id, binder).pipe(
      tap((newBinder) => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: [
            ...(state.binders?.map((b) => (b.id === id ? newBinder : b)) ?? []),
          ],
        }))
      }),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  deleteBinder(id: number, deleteCards: boolean): Observable<boolean> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.deleteBinder(id, deleteCards).pipe(
      tap(() => {
        this.collectionStore.update((state) => ({
          ...state,
          binders: state.binders?.filter((b) => b.id !== id),
        }))
      }),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  addCard(card: ApiCollectionCard): Observable<ApiCollectionCard> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.addCard(card).pipe(
      tap(({ card, deletedIds }) => {
        deletedIds.forEach((id) => this.collectionStore.removeEntity(id))
        this.collectionStore.addEntity(card)
      }),
      map(({ card }) => card),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  addCardsBulk(cards: ApiCollectionCard[]): Observable<ApiCollectionCard[]> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.addCardsBulk(cards).pipe(
      tap(({ cards, deletedIds }) => {
        deletedIds.forEach((id) => this.collectionStore.removeEntity(id))
        cards.forEach((card) => this.collectionStore.addEntity(card))
      }),
      map(({ cards }) => cards),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  updateCard(card: ApiCollectionCard): Observable<ApiCollectionCard> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.updateCard(card).pipe(
      tap(({ card, deletedIds }) => {
        deletedIds.forEach((id) => this.collectionStore.removeEntity(id))
        this.collectionStore.updateEntity(card)
      }),
      map(({ card }) => card),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  deleteCards(ids: number[]): Observable<boolean> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.deleteCard(ids).pipe(
      tap(() => ids.forEach((id) => this.collectionStore.removeEntity(id))),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }

  moveToBinder(
    id: number,
    quantity: number,
    binderId?: number,
  ): Observable<ApiCollectionCard> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService
      .moveCardToBinder(id, quantity, binderId)
      .pipe(
        tap((updatedCard) => {
          this.collectionStore.addEntity(updatedCard)
          const existingCard = this.collectionStore.getEntity(id)
          if (existingCard) {
            const updatedQuantity = existingCard.number - quantity
            if (updatedQuantity <= 0) {
              this.collectionStore.removeEntity(id)
            } else {
              this.collectionStore.updateEntity({
                ...existingCard,
                number: updatedQuantity,
              })
            }
          }
        }),
        finalize(() => this.collectionStore.setLoadingBackground(false)),
      )
  }

  bulkEditCards(
    ids: number[],
    binderId?: number,
    condition?: string,
    language?: string,
  ): Observable<ApiCollectionCard[]> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService
      .bulkEditCards(ids, binderId, condition, language)
      .pipe(
        tap(({ cards, deletedIds }) => {
          deletedIds.forEach((id) => this.collectionStore.removeEntity(id))
          cards.forEach((card) => this.collectionStore.updateEntity(card))
        }),
        map(({ cards }) => cards),
        finalize(() => this.collectionStore.setLoadingBackground(false)),
      )
  }

  exportCollectionAsCsv(binderId?: number): Observable<HttpResponse<Blob>> {
    return this.collectionApiDataService.exportCollection(binderId).pipe(
      tap((response: HttpResponse<Blob>) => {
        let filename = 'collection.csv'
        const disposition = response.headers.get('content-disposition')
        const match = disposition?.match(/filename="?([^"]+)"?/)
        if (match && match[1]) {
          filename = match[1]
        }

        const blob = response.body
        const url = window.URL.createObjectURL(blob!)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }),
    )
  }

  importCollection(
    format: 'VTESDECKS' | 'TWD' | 'LACKEY' | 'VDB',
    file: File,
    binderId?: number,
  ): Observable<ApiCollectionImport> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService
      .importCollection(format, file, binderId)
      .pipe(
        tap(() => {
          this.collectionStore.setLoadingBackground(false)
        }),
        finalize(() => this.collectionStore.setLoadingBackground(false)),
      )
  }

  deleteCollection(): Observable<ApiCollection> {
    this.collectionStore.setLoadingBackground(true)
    return this.collectionApiDataService.deleteCollection().pipe(
      switchMap(() => {
        this.collectionStore.reset()
        return this.initialize()
      }),
      finalize(() => this.collectionStore.setLoadingBackground(false)),
    )
  }
}
