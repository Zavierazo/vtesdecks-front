import { HttpClient, HttpResponse } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { map, Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { ApiCollection } from '../../../models/api-collection'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionCard } from '../../../models/api-collection-card'
import { ApiCollectionImport } from '../../../models/api-collection-import'
import { ApiCollectionPage } from '../../../models/api-collection-page'
import { CollectionQueryState } from '../state/collection.store'

@Injectable({
  providedIn: 'root',
})
export class CollectionApiDataService {
  private readonly httpClient = inject(HttpClient)

  private static readonly collectionsPath = '/user/collections'
  private static readonly publicCollectionsPath = '/collections'

  getCollection(): Observable<ApiCollection> {
    return this.httpClient.get<ApiCollection>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}`,
    )
  }

  deleteCollection(): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}`,
    )
  }

  getBinders(): Observable<ApiCollectionBinder[]> {
    return this.httpClient.get<ApiCollectionBinder[]>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/binders`,
    )
  }

  getBinder(id: number): Observable<ApiCollectionBinder> {
    return this.httpClient.get<ApiCollectionBinder>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/binders/${id}`,
    )
  }

  addBinder(binder: ApiCollectionBinder): Observable<ApiCollectionBinder> {
    return this.httpClient.post<ApiCollectionBinder>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/binders`,
      binder,
    )
  }

  updateBinder(
    id: number,
    binder: ApiCollectionBinder,
  ): Observable<ApiCollectionBinder> {
    return this.httpClient.put<ApiCollectionBinder>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/binders/${id}`,
      binder,
    )
  }

  deleteBinder(id: number, deleteCards: boolean): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/binders/${id}?deleteCards=${deleteCards}`,
    )
  }

  getCards(query: CollectionQueryState): Observable<ApiCollectionPage> {
    return this.httpClient.get<ApiCollectionPage>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards?${this.getQueryFilterParams(query)}`,
    )
  }

  addCard(
    card: ApiCollectionCard,
  ): Observable<{ card: ApiCollectionCard; deletedIds: number[] }> {
    return this.httpClient
      .post<ApiCollectionCard>(
        `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards`,
        card,
        { observe: 'response' },
      )
      .pipe(
        map((response: HttpResponse<ApiCollectionCard>) => {
          const deletedHeader = response.headers.get('X-Card-Deleted')
          const deletedIds =
            deletedHeader
              ?.split(',')
              .map((id) => Number(id))
              .filter((id) => !isNaN(id)) ?? []
          return {
            card: response.body!,
            deletedIds,
          }
        }),
      )
  }

  updateCard(
    card: ApiCollectionCard,
  ): Observable<{ card: ApiCollectionCard; deletedIds: number[] }> {
    return this.httpClient
      .put<ApiCollectionCard>(
        `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/${card.id}`,
        card,
        { observe: 'response' },
      )
      .pipe(
        map((response: HttpResponse<ApiCollectionCard>) => {
          const deletedHeader = response.headers.get('x-card-deleted')
          const deletedIds =
            deletedHeader
              ?.split(',')
              .map((id) => Number(id))
              .filter((id) => !isNaN(id)) ?? []
          return {
            card: response.body!,
            deletedIds,
          }
        }),
      )
  }

  deleteCard(id: number[]): Observable<boolean> {
    return this.httpClient.delete<boolean>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/${id.join(',')}`,
    )
  }

  moveCardToBinder(
    id: number,
    quantity: number,
    binderId?: number,
  ): Observable<ApiCollectionCard> {
    const params = new URLSearchParams()
    if (binderId) {
      params.set('binderId', binderId.toString())
    }
    params.set('quantity', quantity.toString())
    return this.httpClient.patch<ApiCollectionCard>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/${id}/binders?${params.toString()}`,
      {},
    )
  }

  bulkEditCards(
    ids: number[],
    binderId?: number,
    condition?: string,
    language?: string,
  ): Observable<{ cards: ApiCollectionCard[]; deletedIds: number[] }> {
    const params = new URLSearchParams()
    if (binderId) {
      params.set('binderId', binderId.toString())
    }
    if (condition) {
      params.set('condition', condition)
    }
    if (language) {
      params.set('language', language)
    }
    return this.httpClient
      .patch<
        ApiCollectionCard[]
      >(`${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/${ids.join(',')}/bulk?${params.toString()}`, {}, { observe: 'response' })
      .pipe(
        map((response: HttpResponse<ApiCollectionCard[]>) => {
          const deletedHeader = response.headers.get('x-card-deleted')
          const deletedIds =
            deletedHeader
              ?.split(',')
              .map((id) => Number(id))
              .filter((id) => !isNaN(id)) ?? []
          return {
            cards: response.body!,
            deletedIds,
          }
        }),
      )
  }

  exportCollection(binderId?: number): Observable<HttpResponse<Blob>> {
    const params = binderId ? { params: { binderId: binderId.toString() } } : {}
    return this.httpClient.get(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/export`,
      {
        responseType: 'blob',
        observe: 'response',
        ...params,
      },
    )
  }

  importCollection(
    format: 'VTESDECKS' | 'TWD' | 'LACKEY' | 'VDB',
    file: File,
    binderId?: number,
  ): Observable<ApiCollectionImport> {
    const params = new URLSearchParams()
    if (binderId !== undefined) {
      params.set('binderId', binderId.toString())
    }
    const formData = new FormData()
    formData.append('file', file)
    return this.httpClient.post<ApiCollectionImport>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards/import/${format}?${params.toString()}`,
      formData,
    )
  }

  // PUBLIC COLLECTIONS

  getPublicBinder(publicHash: string): Observable<ApiCollectionBinder> {
    return this.httpClient.get<ApiCollectionBinder>(
      `${environment.api.baseUrl}${CollectionApiDataService.publicCollectionsPath}/binders/${publicHash}`,
    )
  }

  getPublicBinderCards(
    publicHash: string,
    query: CollectionQueryState,
  ): Observable<ApiCollectionPage> {
    return this.httpClient.get<ApiCollectionPage>(
      `${environment.api.baseUrl}${CollectionApiDataService.publicCollectionsPath}/binders/${publicHash}/cards?${this.getQueryFilterParams(query)}`,
    )
  }

  // COMMON METHODS

  private getQueryFilterParams(query: CollectionQueryState): string {
    const params = new URLSearchParams()
    params.set('page', query.page.toString())
    params.set('size', query.pageSize.toString())
    params.set('sortBy', query.sortBy)
    params.set('sortDirection', query.sortDirection)
    query.filters.forEach((filter) => {
      const [key, value] = filter
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })
    return params.toString()
  }
}
