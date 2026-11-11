import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ApiAchievementFamily, ApiDeck, ApiDecks } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { UserFollowButtonComponent } from '@shared/components/user-follow-button/user-follow-button.component'
import { AuthQuery } from '@state/auth/auth.query'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { of, Subject } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '../../../../assets/i18n/en.json'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { WishlistApiDataService } from '../../wishlist/services/wishlist-api.data.service'
import { UserPublicProfileComponent } from './user-public-profile.component'

describe('UserPublicProfileComponent', () => {
  const routes = new Subject<Record<string, unknown>>()
  const tournamentRequest = vi.fn()
  const communityInit = vi.fn()
  const modalOpen = vi.fn()
  const publicUser = vi.fn()
  const signedInUser = vi.fn<() => string | undefined>()
  const publicAchievements = vi.fn()
  const myAchievements = vi.fn()
  let fixture: ComponentFixture<UserPublicProfileComponent>
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
    signedInUser.mockReset()
    publicAchievements.mockReset().mockReturnValue(of([]))
    myAchievements.mockReset().mockReturnValue(of([]))
    publicUser
      .mockReset()
      .mockReturnValue(of({ user: 'alice', roles: [], veknId: '00123' }))
    modalOpen.mockReset().mockReturnValue({
      componentInstance: {
        rolesChanged: new Subject<string[]>(),
        veknIdChanged: new Subject<string | null>(),
      },
    })
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: routes } },
        {
          provide: ApiDataService,
          useValue: {
            getUserTournamentDecks: tournamentRequest,
            getPublicUser: publicUser,
            getPublicUserAchievements: publicAchievements,
            getMyAchievements: myAchievements,
          },
        },
        {
          provide: AuthQuery,
          useValue: { getUser: signedInUser, selectAdmin: () => of(false) },
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
        { provide: NgbModal, useValue: { open: modalOpen } },
      ],
    }).overrideComponent(UserPublicProfileComponent, {
      remove: { imports: [UserFollowButtonComponent] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    })
    fixture = TestBed.createComponent(UserPublicProfileComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })
  const visit = (user: string) => routes.next({ user: { user, roles: [] } })
  const page = (start: number, count: number, total: number) =>
    ({
      decks: Array.from(
        { length: count },
        (_, i) => ({ id: `${start + i}` }) as ApiDeck,
      ),
      total,
    }) as ApiDecks

  it('refreshes profile identity and tournament decks after an administrator changes VEKN', () => {
    visit('alice')
    component.openAdminSettings()
    modalOpen.mock.results[0].value.componentInstance.veknIdChanged.next(
      '00123',
    )
    expect(publicUser).toHaveBeenCalledWith('alice')
    expect(component.user()?.veknId).toBe('00123')
    expect(tournamentRequest).toHaveBeenCalledTimes(2)
  })

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

  it.each(['public', 'owner'])(
    'uses the Anniversary date format for Advent on the %s profile',
    (viewer) => {
      const achievements: ApiAchievementFamily[] = [
        {
          id: 'advent_challenger',
          icon: 'bi-gift',
          repeatCount: 2,
          tiers: [{ id: 'advent_challenger_1', threshold: 1, earned: true }],
          earnedDates: [
            new Date('2025-12-01T00:00:00Z'),
            new Date('2026-12-04T00:00:00Z'),
          ],
        },
        {
          id: 'anniversary',
          icon: 'bi-hourglass-split',
          repeatCount: 1,
          tiers: [{ id: 'anniversary_1', threshold: 1, earned: true }],
          earnedDates: [new Date('2026-01-01T00:00:00Z')],
        },
      ]
      const request = viewer === 'owner' ? myAchievements : publicAchievements
      signedInUser.mockReturnValue(viewer === 'owner' ? 'alice' : undefined)
      request.mockReturnValue(of(achievements))

      visit('alice')
      fixture.detectChanges()

      expect(request).toHaveBeenCalledOnce()
      const profile = fixture.nativeElement as HTMLElement
      const [advent, anniversary] =
        profile.querySelectorAll('.achievement-card')
      expect(advent.querySelector('h5')?.textContent?.trim()).toBe(
        'Advent Challenger',
      )
      expect(advent.querySelector('.badge')?.textContent?.trim()).toBe('×2')
      expect(
        Array.from(advent.querySelectorAll('details li'), (item) =>
          item.textContent?.trim(),
        ),
      ).toEqual(['December 2025', 'December 2026'])
      expect(anniversary.querySelector('details li')?.textContent?.trim()).toBe(
        'January 2026',
      )
    },
  )
})
