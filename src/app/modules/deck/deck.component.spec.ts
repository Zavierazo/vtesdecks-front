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
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckComponent } from './deck.component'

describe('DeckComponent view tracking', () => {
  afterEach(() => {
    vi.useRealTimers()
    TestBed.resetTestingModule()
  })

  function setup(deck: ApiDeck) {
    const deckView = vi.fn(() => of(true))
    const markVisited = vi.fn()

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
        { provide: ToastService, useValue: {} },
        { provide: ApiDataService, useValue: { deckView } },
        { provide: ChangeDetectorRef, useValue: {} },
        {
          provide: PreviousRouteService,
          useValue: { getPreviousUrl: () => '/previous' },
        },
        { provide: MediaService, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: CryptQuery, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: Clipboard, useValue: {} },
        { provide: TranslocoService, useValue: {} },
        { provide: DeckHistoryService, useValue: {} },
      ],
    })

    const component = TestBed.runInInjectionContext(() => new DeckComponent())
    component.id = deck.id
    return { component, deckView, markVisited }
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
})
