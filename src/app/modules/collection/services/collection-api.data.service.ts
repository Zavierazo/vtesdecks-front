import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { ApiCollection } from '../../../models/api-collection'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ApiCollectionCard } from '../../../models/api-collection-card'
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

  createCard(card: ApiCollectionCard): Observable<ApiCollectionCard> {
    return this.httpClient.post<ApiCollectionCard>(
      `${environment.api.baseUrl}${CollectionApiDataService.collectionsPath}/cards`,
      card,
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
