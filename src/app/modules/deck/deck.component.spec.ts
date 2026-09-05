import { Clipboard } from '@angular/cdk/clipboard'
import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
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
import { Observable, of, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckComponent } from './deck.component'

describe('DeckComponent view tracking', () => {
  afterEach(() => {
    vi.useRealTimers()
    TestBed.resetTestingModule()
  })

  function setup(deck: ApiDeck, bookmarkResult: Observable<boolean> = of(true)) {
    const deckView = vi.fn(() => of(true))
    const bookmarkDeck = vi.fn(() => bookmarkResult)
    const markVisited = vi.fn()
    const detectChanges = vi.fn()

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: SeoService, useValue: {} },
        { provide: DeckQuery, useValue: { getDeck: () => deck } },
        { provide: DeckService, useValue: {} },
        { provide: DecksService, useValue: { markVisited } },
        { provide: DeckBuilderService, useValue: {} },
        {
          provide: AuthQuery,
          useValue: { selectDeckDisplayMode: () => of('grid') },
        },
        { provide: AuthService, useValue: {} },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: ApiDataService, useValue: { deckView, bookmarkDeck } },
        { provide: ChangeDetectorRef, useValue: { detectChanges } },
        {
          provide: PreviousRouteService,
          useValue: { getPreviousUrl: () => '/previous' },
        },
        { provide: MediaService, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: CryptQuery, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: Clipboard, useValue: {} },
        { provide: TranslocoService, useValue: { translate: vi.fn() } },
        { provide: DeckHistoryService, useValue: {} },
      ],
    })

    const component = TestBed.runInInjectionContext(() => new DeckComponent())
    component.id = deck.id
    return { component, deckView, bookmarkDeck, markVisited, detectChanges }
  }

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
