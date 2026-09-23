import { Clipboard } from '@angular/cdk/clipboard'
import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { ApiDeck } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import {
  ApiDataService,
  DeckHistoryService,
  MediaService,
  PreviousRouteService,
  SeoService,
  ToastService,
} from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { CryptQuery } from '@state/crypt/crypt.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { DeckQuery } from '@state/deck/deck.query'
import { DeckService } from '@state/deck/deck.service'
import { DecksService } from '@state/decks/decks.service'
import { Subject, Observable, of, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckComponent } from './deck.component'
import { DeckShareService } from '../../services/deck-share.service'
import { decodeSnapshot } from '../../utils/deck-snapshot'
import { DeckSnapshotService } from '../../services/deck-snapshot.service'

describe('DeckComponent view tracking', () => {
  afterEach(() => {
    vi.useRealTimers()
    TestBed.resetTestingModule()
  })

  function setup(
    deck: ApiDeck,
    bookmarkResult: Observable<boolean> = of(true),
    snapshot = false,
  ) {
    const deckView = vi.fn(() => of(true))
    const bookmarkDeck = vi.fn(() => bookmarkResult)
    const rateDeck = vi.fn(() => of(true))
    const getDeck = vi.fn(() => of(deck))
    const markVisited = vi.fn()
    const detectChanges = vi.fn()
    const navigateByUrl = vi.fn()
    const addVisitedDeck = vi.fn()
    const seoUpdate = vi.fn()
    const events = new Subject<NavigationEnd>()
    const router = {
      events,
      url: '/deck/snapshot?name=first#200001=3',
      navigateByUrl,
    }
    const fragments = {
      next: (name: string) => {
        router.url = `/deck/snapshot?name=${name}#200001=3`
        events.next(new NavigationEnd(1, router.url, router.url))
      },
    }
    const share = vi.fn()
    const navigate = (url: string) => {
      router.url = url
      events.next(new NavigationEnd(1, url, url))
    }
    const snapshotDeck = {
      ...deck,
      id: '',
      type: 'SNAPSHOT',
      name: 'Snapshot',
      crypt: [{ id: 200001, number: 3 }],
      library: [],
    } as ApiDeck
    const loadSnapshot = vi.fn((link: string) =>
      decodeSnapshot(link).name === 'invalid'
        ? throwError(() => new Error('invalid'))
        : of({
            deck: { ...snapshotDeck, name: decodeSnapshot(link).name },
            unknown: [],
            snapshot: decodeSnapshot(link),
          }),
    )

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { snapshot } } },
        },
        { provide: SeoService, useValue: { update: seoUpdate } },
        { provide: DeckSnapshotService, useValue: { load: loadSnapshot } },
        { provide: DeckQuery, useValue: { getDeck: () => deck } },
        { provide: DeckService, useValue: {} },
        { provide: DecksService, useValue: { markVisited } },
        { provide: DeckBuilderService, useValue: {} },
        {
          provide: AuthQuery,
          useValue: {
            selectDeckDisplayMode: () => of('grid'),
            selectAuthenticated: () => of(false),
            selectDisplayName: () => of(''),
            selectAdmin: () => of(false),
          },
        },
        { provide: AuthService, useValue: {} },
        { provide: ToastService, useValue: { show: vi.fn() } },
        {
          provide: ApiDataService,
          useValue: { deckView, bookmarkDeck, rateDeck, getDeck },
        },
        { provide: ChangeDetectorRef, useValue: { detectChanges } },
        {
          provide: PreviousRouteService,
          useValue: { getPreviousUrl: () => '/previous' },
        },
        {
          provide: MediaService,
          useValue: {
            observeMobile: () => of(false),
            observeMobileOrTablet: () => of(false),
          },
        },
        { provide: NgbModal, useValue: {} },
        { provide: CryptQuery, useValue: {} },
        { provide: Router, useValue: router },
        { provide: DeckShareService, useValue: { share } },
        { provide: Clipboard, useValue: {} },
        { provide: TranslocoService, useValue: { translate: vi.fn() } },
        { provide: DeckHistoryService, useValue: { addVisitedDeck } },
      ],
    })

    const component = TestBed.runInInjectionContext(() => new DeckComponent())
    component.id = deck.id
    return {
      component,
      deckView,
      bookmarkDeck,
      rateDeck,
      getDeck,
      markVisited,
      detectChanges,
      navigateByUrl,
      fragments,
      navigate,
      share,
      loadSnapshot,
      seoUpdate,
      addVisitedDeck,
    }
  }

  it('shows the saved personal rating and refreshes community totals without replacing the selected hearts', () => {
    const { component, rateDeck, getDeck } = setup({
      id: 'other',
      rate: 3,
      votes: 2,
    } as ApiDeck)
    const response = new Subject<boolean>()
    rateDeck.mockReturnValue(response)
    getDeck.mockReturnValue(of({ id: 'other', rate: 3.5, votes: 3 } as ApiDeck))
    component.rateDeck(4)
    component.rateDeck(5)
    expect(rateDeck).toHaveBeenCalledTimes(1)
    expect(component.personalRating()).toBeNull()
    response.next(true)
    response.complete()
    expect(component.personalRating()).toBe(4)
    expect(component.displayedRating()).toBe(4)
    expect(component.communityRating()).toEqual({ rate: 3.5, votes: 3 })
    expect(component.ratingPending()).toBe(false)
  })

  it('restores the previous rating on save failure and retains a successful vote if refreshing totals fails', () => {
    const { component, rateDeck, getDeck } = setup({
      id: 'other',
      rate: 3,
      votes: 2,
    } as ApiDeck)
    rateDeck.mockReturnValue(throwError(() => new Error('save failed')))
    component.rateDeck(5)
    expect(component.displayedRating()).toBe(3)
    expect(component.personalRating()).toBeNull()
    expect(getDeck).not.toHaveBeenCalled()
    rateDeck.mockReturnValue(of(true))
    getDeck.mockReturnValue(throwError(() => new Error('refresh failed')))
    component.rateDeck(4)
    expect(component.personalRating()).toBe(4)
    expect(component.displayedRating()).toBe(4)
    expect(component.ratingPending()).toBe(false)
  })

  it('does not apply a late rating response to another deck', () => {
    const { component, rateDeck } = setup({
      id: 'first',
      rate: 3,
      votes: 2,
    } as ApiDeck)
    const response = new Subject<boolean>()
    rateDeck.mockReturnValue(response)
    component.rateDeck(4)
    component.id = 'second'
    response.next(true)
    response.complete()
    expect(component.personalRating()).toBeNull()
    expect(component.communityRating()).toBeNull()
  })

  it('uses local snapshot data without normal deck queries, visits, history or social calls', () => {
    const {
      component,
      deckView,
      bookmarkDeck,
      markVisited,
      addVisitedDeck,
      seoUpdate,
      navigateByUrl,
      fragments,
    } = setup({ id: 'original', name: 'Original' } as ApiDeck, of(true), true)
    component.ngOnInit()
    const names: (string | undefined)[] = []
    const subscription = component.deck$.subscribe((deck) =>
      names.push(deck?.name),
    )
    component.ngAfterViewInit()
    component.toggleBookmark()
    component.rateDeck(5)
    component.onCopyToClipboard('TWD')
    component.onCollectionTracker()
    component.fetchSimilarDecks()
    component.deleteDeck()
    component.onCompare()
    expect(deckView).not.toHaveBeenCalled()
    expect(bookmarkDeck).not.toHaveBeenCalled()
    expect(markVisited).not.toHaveBeenCalled()
    expect(addVisitedDeck).not.toHaveBeenCalled()
    expect(seoUpdate).not.toHaveBeenCalled()
    component.onOpenInBuilder()
    expect(navigateByUrl).toHaveBeenCalledWith('/decks/builder', {
      state: {
        deck: expect.objectContaining({
          id: '',
          name: 'first',
          crypt: [{ id: 200001, number: 3 }],
        }),
      },
    })
    navigateByUrl.mock.calls[0][1].state.deck.crypt[0].number = 9
    expect(component.snapshot.cards).toEqual([[200001, 3]])
    fragments.next('second')
    expect(names.at(-1)).toBe('second')
    fragments.next('invalid')
    expect(component.snapshotError()).toBe('invalid')
    expect(names.at(-1)).toBeUndefined()
    fragments.next('first')
    expect(component.snapshotError()).toBeUndefined()
    expect(names.at(-1)).toBe('first')
    subscription.unsubscribe()
  })

  it('reloads query and fragment navigation, retries and shares all original cards', () => {
    const { component, navigate, share, loadSnapshot } = setup(
      { id: 'original' } as ApiDeck,
      of(true),
      true,
    )
    component.ngOnInit()
    const subscription = component.deck$.subscribe()
    navigate(
      '/deck/snapshot?name=Edited&author=A&description=Text%0ALine#200001=3;299999=0',
    )
    expect(component.snapshot).toEqual({
      name: 'Edited',
      author: 'A',
      description: 'Text\nLine',
      cards: [
        [200001, 3],
        [299999, 0],
      ],
    })
    component.onShare()
    expect(decodeSnapshot(share.mock.calls[0][0])).toEqual(component.snapshot)
    navigate('/deck/snapshot?name=Metadata#200001=3;299999=0')
    expect(component.snapshot.name).toBe('Metadata')
    navigate('/deck/snapshot?name=Metadata#200001=4')
    expect(component.snapshot.cards).toEqual([[200001, 4]])
    const calls = loadSnapshot.mock.calls.length
    component.retrySnapshot()
    expect(loadSnapshot).toHaveBeenCalledTimes(calls + 1)
    navigate('/deck/snapshot?name=first#200001=3')
    expect(component.snapshot.name).toBe('first')
    subscription.unsubscribe()
  })

  it('tracks a spoiler preconstructed deck immediately', () => {
    const { component, deckView, markVisited } = setup({
      id: 'spoiler-deck',
      type: 'PRECONSTRUCTED',
      tags: ['spoiler'],
    } as ApiDeck)

    component.ngAfterViewInit()

    expect(deckView).toHaveBeenCalledWith('spoiler-deck', '/previous')
    expect(markVisited).toHaveBeenCalledWith('spoiler-deck')
  })

  it.each([
    ['a non-spoiler preconstructed deck', 'PRECONSTRUCTED', []],
    ['another deck type', 'COMMUNITY', ['spoiler']],
  ])('waits five seconds before tracking %s', (_, type, tags) => {
    vi.useFakeTimers()
    const { component, deckView, markVisited } = setup({
      id: 'regular-deck',
      type,
      tags,
    } as ApiDeck)

    component.ngAfterViewInit()
    vi.advanceTimersByTime(4999)
    expect(deckView).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(deckView).toHaveBeenCalledWith('regular-deck', '/previous')
    expect(markVisited).toHaveBeenCalledWith('regular-deck')
  })

  it('blocks rating and bookmark changes for owned decks, including saved bookmarks', () => {
    const { component, bookmarkDeck, rateDeck } = setup({
      id: 'owned',
      owner: true,
    } as ApiDeck)
    component.bookmarkCount = 3
    component.rateDeck(5)
    component.toggleBookmark()
    component.isBookmarked = true
    component.toggleBookmark()
    expect(rateDeck).not.toHaveBeenCalled()
    expect(bookmarkDeck).not.toHaveBeenCalled()
    expect(component.isBookmarked).toBe(true)
    expect(component.bookmarkCount).toBe(3)
  })

  it('allows rating another user’s deck', () => {
    const { component, rateDeck } = setup({
      id: 'other',
      owner: false,
    } as ApiDeck)
    component.rateDeck(4)
    expect(rateDeck).toHaveBeenCalledWith('other', 4)
  })

  it('increments the count after bookmarking succeeds', () => {
    const { component, bookmarkDeck, detectChanges } = setup({
      id: 'bookmark-me',
      type: 'COMMUNITY',
    } as ApiDeck)
    component.bookmarkCount = 2

    component.toggleBookmark()

    expect(bookmarkDeck).toHaveBeenCalledWith('bookmark-me', true)
    expect(component.isBookmarked).toBe(true)
    expect(component.bookmarkCount).toBe(3)
    expect(detectChanges).toHaveBeenCalled()
  })

  it('decrements the count after unbookmarking succeeds', () => {
    const { component } = setup({
      id: 'unbookmark-me',
      type: 'COMMUNITY',
    } as ApiDeck)
    component.isBookmarked = true
    component.bookmarkCount = 2

    component.toggleBookmark()

    expect(component.isBookmarked).toBe(false)
    expect(component.bookmarkCount).toBe(1)
  })

  it('keeps the bookmark state unchanged when the request fails', () => {
    const { component } = setup(
      { id: 'failed-bookmark', type: 'COMMUNITY' } as ApiDeck,
      throwError(() => new Error('request failed')),
    )
    component.bookmarkCount = 2

    component.toggleBookmark()

    expect(component.isBookmarked).toBe(false)
    expect(component.bookmarkCount).toBe(2)
  })

  it('never decrements the bookmark count below zero', () => {
    const { component } = setup({
      id: 'zero-bookmarks',
      type: 'COMMUNITY',
    } as ApiDeck)
    component.isBookmarked = true

    component.toggleBookmark()

    expect(component.bookmarkCount).toBe(0)
  })
})
