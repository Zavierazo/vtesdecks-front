import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCard, ApiDeck, ApiSuggestedCardsResponse } from '@models'
import { ApiDataService } from '@services'
import { Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { LocalDeckDraftsService } from '../../services/local-deck-drafts.service'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderService } from './deck-builder.service'
import { DeckBuilderStore } from './deck-builder.store'

describe('Recommendation response ownership', () => {
  afterEach(() => {
    TestBed.resetTestingModule()
    vi.useRealTimers()
  })

  function setup() {
    vi.useFakeTimers()
    const state: { id?: string; cards: ApiCard[] } = {
      id: 'deck-a',
      cards: [
        { id: 200001, number: 6 },
        { id: 100001, number: 40 },
      ],
    }
    const responses: Subject<ApiSuggestedCardsResponse>[] = []
    const setSuggestedCards = vi.fn()
    const isBelowThreshold = vi.fn(() => false)
    const getSuggestedCards = vi.fn(() => {
      const response = new Subject<ApiSuggestedCardsResponse>()
      responses.push(response)
      return response
    })
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DeckBuilderStore,
          useValue: {
            getValue: () => state,
            setSuggestedCards,
            reset: () => {
              state.id = undefined
              state.cards = []
            },
          },
        },
        { provide: DeckBuilderQuery, useValue: { isBelowThreshold } },
        { provide: ApiDataService, useValue: { getSuggestedCards } },
        ...[
          LibraryQuery,
          CollectionApiDataService,
          TranslocoService,
          LocalDeckDraftsService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    })
    return {
      service: TestBed.inject(DeckBuilderService),
      state,
      responses,
      setSuggestedCards,
      isBelowThreshold,
      getSuggestedCards,
    }
  }

  it('coalesces all refreshes for three seconds and uses the current cards', () => {
    const { service, state, getSuggestedCards } = setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(600)
    state.cards = state.cards.map((card) => ({
      ...card,
      number: card.number + 1,
    }))
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(2999)
    expect(getSuggestedCards).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(getSuggestedCards).toHaveBeenCalledExactlyOnceWith(state.cards)
  })

  it('allows a response during the pause, then cancels the previous request', () => {
    const { service, responses, setSuggestedCards } = setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    service.fetchSuggestedCards()
    expect(responses[0].observed).toBe(true)
    responses[0].next({ keyCrypt: [] })
    expect(setSuggestedCards).toHaveBeenCalledWith({ keyCrypt: [] })
    vi.advanceTimersByTime(3000)
    expect(responses[0].observed).toBe(false)
    setSuggestedCards.mockClear()
    responses[0].next({ keyCrypt: [] })
    responses[1].next({ keyLibrary: [] })
    expect(setSuggestedCards).toHaveBeenCalledExactlyOnceWith({
      keyLibrary: [],
    })
  })

  it('clears below threshold after the pause without another API request', () => {
    const {
      service,
      responses,
      setSuggestedCards,
      isBelowThreshold,
      getSuggestedCards,
    } = setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    isBelowThreshold.mockReturnValue(true)
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    expect(responses[0].observed).toBe(false)
    expect(getSuggestedCards).toHaveBeenCalledTimes(1)
    expect(setSuggestedCards).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('clears on failure and continues handling later refreshes', () => {
    const { service, responses, setSuggestedCards } = setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    responses[0].error(new Error('request failed'))
    expect(setSuggestedCards).toHaveBeenCalledExactlyOnceWith(null)
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    responses[1].next({ keyCrypt: [] })
    expect(setSuggestedCards).toHaveBeenLastCalledWith({ keyCrypt: [] })
  })

  it('restarts the pause on reset and checks the reset deck before requesting', () => {
    const { service, getSuggestedCards, isBelowThreshold, setSuggestedCards } =
      setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(500)
    service.init(undefined, undefined as unknown as ApiDeck).subscribe()
    isBelowThreshold.mockReturnValue(true)
    vi.advanceTimersByTime(3000)
    expect(getSuggestedCards).not.toHaveBeenCalled()
    expect(setSuggestedCards).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('cancels the active request and any pending debounce on destruction', () => {
    const { service, getSuggestedCards, responses } = setup()
    service.fetchSuggestedCards()
    vi.advanceTimersByTime(3000)
    service.fetchSuggestedCards()
    TestBed.resetTestingModule()
    expect(responses[0].observed).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(getSuggestedCards).toHaveBeenCalledTimes(1)
  })
})
