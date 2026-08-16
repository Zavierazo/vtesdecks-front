import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { FILTER_CARD_TYPE } from '@models'
import { environment } from '@environments/environment'
import { afterEach, describe, expect, it } from 'vitest'
import { WishlistQueryState } from '../state/wishlist.store'
import { WishlistApiDataService } from './wishlist-api.data.service'

describe('WishlistApiDataService', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    return {
      service: TestBed.inject(WishlistApiDataService),
      http: TestBed.inject(HttpTestingController),
    }
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify()
  })

  const baseQuery: WishlistQueryState = {
    page: 1,
    pageSize: 50,
    sortBy: 'cardName',
    sortDirection: 'desc',
    filters: [[FILTER_CARD_TYPE, 'library']],
  }

  it('uses the legacy GET endpoint when cardIds is undefined', () => {
    const { service, http } = setup()
    service.getCards(baseQuery).subscribe()

    const request = http.expectOne(
      (req) =>
        req.method === 'GET' &&
        req.url.startsWith(`${environment.api.baseUrl}/user/wishlist/cards`),
    )
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })

  it('POSTs to /cards/search when cardIds is set', () => {
    const { service, http } = setup()
    service.getCards({ ...baseQuery, cardIds: [100001] }).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/user/wishlist/cards/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({
      page: 1,
      size: 50,
      sortBy: 'cardName',
      sortDirection: 'desc',
      filters: { cardType: 'library' },
      cardIds: [100001],
    })
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })

  it('uses the public wishlist search endpoint when cardIds is set', () => {
    const { service, http } = setup()
    service
      .getUserPublicWishlist('alice', { ...baseQuery, cardIds: [1, 2] })
      .subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/collections/users/alice/wishlist/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body.cardIds).toEqual([1, 2])
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })
})
