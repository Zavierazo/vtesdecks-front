import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { FILTER_CARD_TYPE, FILTER_SET } from '@models'
import { environment } from '@environments/environment'
import { afterEach, describe, expect, it } from 'vitest'
import { CollectionQueryState } from '../state/collection.store'
import { CollectionApiDataService } from './collection-api.data.service'

describe('CollectionApiDataService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    return {
      service: TestBed.inject(CollectionApiDataService),
      http: TestBed.inject(HttpTestingController),
    }
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
  })

  const baseQuery: CollectionQueryState = {
    page: 0,
    pageSize: 20,
    sortBy: 'cardName',
    sortDirection: 'asc',
    filters: [
      [FILTER_CARD_TYPE, 'crypt'],
      [FILTER_SET, undefined],
    ],
  }

  it('POSTs to /cards/search when cardIds is undefined', () => {
    const { service, http } = setup()
    service.getCards(baseQuery).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/user/collections/cards/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      page: 0,
      size: 20,
      sortBy: 'cardName',
      sortDirection: 'asc',
      filters: { cardType: 'crypt' },
      cardIds: undefined,
    })
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })

  it('POSTs to /cards/search with the id list when cardIds is set', () => {
    const { service, http } = setup()
    service.getCards({ ...baseQuery, cardIds: [200001, 200002] }).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/user/collections/cards/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      page: 0,
      size: 20,
      sortBy: 'cardName',
      sortDirection: 'asc',
      filters: { cardType: 'crypt' },
      cardIds: [200001, 200002],
    })
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })

  it('POSTs an empty cardIds list as-is (filter active, no matches)', () => {
    const { service, http } = setup()
    service.getCards({ ...baseQuery, cardIds: [] }).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/user/collections/cards/search`,
    )
    expect(request.request.body.cardIds).toEqual([])
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })

  it('always uses the public binder search endpoint', () => {
    const { service, http } = setup()
    service.getPublicBinderCards('abc123', baseQuery).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/collections/binders/abc123/cards/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body.cardIds).toBeUndefined()
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })
})
