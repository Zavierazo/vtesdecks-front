import { TestBed } from '@angular/core/testing'
import {
  ApiCollection,
  ApiCollectionBinder,
  ApiCollectionCard,
  ApiCollectionPage,
} from '@models'
import { CollectionCardStatsService } from '../../../services/collection-card-stats.service'
import { Subject, of } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionApiDataService } from '../services/collection-api.data.service'
import { CollectionPrivateService } from './collection-private.service'
import { CollectionPublicService } from './collection-public.service'
import { CollectionStore } from './collection.store'

describe('collection context isolation', () => {
  const publicBinder = {
    id: 59,
    publicHash: 'public-hash',
  } as ApiCollectionBinder

  let privateService: CollectionPrivateService
  let publicService: CollectionPublicService
  let store: CollectionStore
  let api: {
    getCollection: ReturnType<typeof vi.fn>
    getCards: ReturnType<typeof vi.fn>
    getPublicBinder: ReturnType<typeof vi.fn>
    getPublicBinderCards: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    api = {
      getCollection: vi.fn(() =>
        of({
          id: 1,
          binders: [],
          creationDate: new Date(),
          modificationDate: new Date(),
        } as ApiCollection),
      ),
      getCards: vi.fn(),
      getPublicBinder: vi.fn(() => of(publicBinder)),
      getPublicBinderCards: vi.fn(),
    }

    TestBed.configureTestingModule({
      providers: [
        CollectionPrivateService,
        CollectionPublicService,
        CollectionStore,
        { provide: CollectionApiDataService, useValue: api },
        {
          provide: CollectionCardStatsService,
          useValue: { invalidate: vi.fn() },
        },
      ],
    })

    privateService = TestBed.inject(CollectionPrivateService)
    publicService = TestBed.inject(CollectionPublicService)
    store = TestBed.inject(CollectionStore)
  })

  it('ignores a private card response after a public binder takes ownership', () => {
    const privateCards$ = new Subject<ApiCollectionPage>()
    api.getCards.mockReturnValue(privateCards$)

    privateService.initialize().subscribe()
    privateService.fetchCards().subscribe()
    publicService.initialize(publicBinder.publicHash!).subscribe()

    privateCards$.next(pageWithCard(1))
    privateCards$.complete()

    expect(store.getEntities()).toEqual([])
  })

  it('ignores a public card response after the private collection takes ownership', () => {
    const publicCards$ = new Subject<ApiCollectionPage>()
    api.getPublicBinderCards.mockReturnValue(publicCards$)

    publicService.initialize(publicBinder.publicHash!).subscribe()
    publicService.fetchCards().subscribe()
    privateService.initialize().subscribe()

    publicCards$.next(pageWithCard(2))
    publicCards$.complete()

    expect(store.getEntities()).toEqual([])
  })
})

function pageWithCard(id: number): ApiCollectionPage {
  return {
    totalPages: 1,
    totalElements: 1,
    content: [{ id, cardId: id, cardName: `Card ${id}` } as ApiCollectionCard],
  }
}
