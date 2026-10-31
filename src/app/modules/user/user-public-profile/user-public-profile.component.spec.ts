import { OnDestroy } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { ApiDeck, ApiDecks } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { of, Subject } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { WishlistApiDataService } from '../../wishlist/services/wishlist-api.data.service'
import { UserPublicProfileComponent } from './user-public-profile.component'

describe('Public profile tournament decks', () => {
  const routes = new Subject<Record<string, unknown>>()
  const tournamentRequest = vi.fn()
  const communityInit = vi.fn()
  let component: UserPublicProfileComponent
  let pages: Subject<ApiDecks>[]
  beforeEach(() => {
    pages = []
    tournamentRequest.mockReset().mockImplementation(() => {
      const page = new Subject<ApiDecks>()
      pages.push(page)
      return page
    })
    communityInit.mockReset()
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { data: routes } },
        {
          provide: ApiDataService,
          useValue: {
            getUserTournamentDecks: tournamentRequest,
            getPublicUserAchievements: () => of([]),
          },
        },
        {
          provide: AuthQuery,
          useValue: { getUser: () => undefined, selectAdmin: () => of(false) },
        },
        {
          provide: DecksService,
          useValue: { init: communityInit, getMore: () => of(undefined) },
        },
        {
          provide: DecksQuery,
          useValue: {
            selectLoading: () => of(false),
            selectAll: () => of([]),
            selectTotal: () => of(0),
          },
        },
        {
          provide: CollectionApiDataService,
          useValue: { getUserPublicCollections: () => of({ binders: [] }) },
        },
        {
          provide: WishlistApiDataService,
          useValue: { getUserPublicWishlist: () => of({ totalElements: 0 }) },
        },
        { provide: NgbModal, useValue: {} },
      ],
    })
    component = TestBed.runInInjectionContext(
      () => new UserPublicProfileComponent(),
    )
    component.ngOnInit()
  })
  afterEach(() => (component as unknown as OnDestroy).ngOnDestroy())
  const visit = (user: string) => routes.next({ user: { user, roles: [] } })
  const page = (start: number, count: number, total: number) =>
    ({
      decks: Array.from(
        { length: count },
        (_, i) => ({ id: `${start + i}` }) as ApiDeck,
      ),
      total,
    }) as ApiDecks

  it('paginates independently and prevents overlapping requests', () => {
    visit('alice')
    component.loadMoreTournamentDecks()
    expect(tournamentRequest).toHaveBeenCalledExactlyOnceWith('alice', 0, 6)
    pages[0].next(page(0, 6, 7))
    component.loadMoreTournamentDecks()
    expect(tournamentRequest).toHaveBeenLastCalledWith('alice', 6, 6)
    pages[1].next(page(6, 1, 7))
    expect(component.tournamentDecks()).toHaveLength(7)
    expect(component.tournamentTotal()).toBe(7)
    expect(communityInit).toHaveBeenCalledTimes(1)
  })

  it('cancels old profile requests and discards late responses', () => {
    visit('alice')
    visit('bob')
    pages[0].next(page(0, 6, 100))
    expect(component.tournamentDecks()).toEqual([])
    expect(component.tournamentTotal()).toBe(0)
    pages[1].next(page(10, 1, 1))
    expect(component.tournamentDecks()[0].id).toBe('10')
    expect(component.tournamentTotal()).toBe(1)
  })

  it('retains loaded decks and retries a failed page at the same offset', () => {
    visit('alice')
    pages[0].next(page(0, 6, 7))
    component.loadMoreTournamentDecks()
    pages[1].error(new Error('offline'))
    expect(component.tournamentError()).toBe(true)
    expect(component.tournamentDecks()).toHaveLength(6)
    component.loadMoreTournamentDecks()
    expect(tournamentRequest).toHaveBeenLastCalledWith('alice', 6, 6)
  })
})
