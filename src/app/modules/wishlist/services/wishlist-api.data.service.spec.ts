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

  it('POSTs to /cards/search when cardIds is undefined', () => {
    const { service, http } = setup()
    service.getCards(baseQuery).subscribe()

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
      cardIds: undefined,
    })
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

  it('always uses the public wishlist search endpoint', () => {
    const { service, http } = setup()
    service.getUserPublicWishlist('alice', baseQuery).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/collections/users/alice/wishlist/search`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.body.cardIds).toBeUndefined()
    request.flush({ totalPages: 0, totalElements: 0, content: [] })
  })
})
