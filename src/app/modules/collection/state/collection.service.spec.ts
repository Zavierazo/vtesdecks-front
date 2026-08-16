import { Injectable } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ApiCollectionPage, FILTER_CARD_TYPE, FILTER_SET } from '@models'
import { EMPTY, Observable } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { CollectionService } from './collection.service'
import { CollectionStore } from './collection.store'

@Injectable()
class TestCollectionService extends CollectionService {
  fetchCards(): Observable<ApiCollectionPage> {
    return EMPTY
  }
  getCards(): Observable<ApiCollectionPage> {
    return EMPTY
  }
}

describe('CollectionService cardIds handling', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [TestCollectionService] })
    const store = TestBed.inject(CollectionStore)
    store.reset()
    return { service: TestBed.inject(TestCollectionService), store }
  }

  it('setCardIds stores the ids and resets the page', () => {
    const { service, store } = setup()
    service.setPage(3)
    service.setCardIds([1, 2, 3])

    expect(store.getValue().query.cardIds).toEqual([1, 2, 3])
    expect(store.getValue().query.page).toBe(0)
  })

  it('setCardTypeFilter sets the tab and clears cardIds in one update', () => {
    const { service, store } = setup()
    service.setFilter(FILTER_SET, 'V5')
    service.setCardIds([1, 2])
    service.setCardTypeFilter('library')

    const { query } = store.getValue()
    expect(query.cardIds).toBeUndefined()
    expect(query.filters).toContainEqual([FILTER_CARD_TYPE, 'library'])
    expect(query.filters).toContainEqual([FILTER_SET, 'V5'])
  })

  it('setCardTypeFilter without a tab removes the card type filter', () => {
    const { service, store } = setup()
    service.setCardTypeFilter('crypt')
    service.setCardIds([5])
    service.setCardTypeFilter(undefined)

    const { query } = store.getValue()
    expect(query.cardIds).toBeUndefined()
    expect(
      query.filters.find((filter) => filter[0] === FILTER_CARD_TYPE),
    ).toBeUndefined()
  })
})
