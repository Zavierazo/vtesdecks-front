import { TestBed } from '@angular/core/testing'
import { ADVENT_2026_ERRORS } from '@advent/advent-2026.data'
import { TranslocoService } from '@jsverse/transloco'
import {
  ApiCard,
  ApiDeck,
  ApiDeckBuilder,
  ApiDeckArchetype,
  ApiDeckExtra,
} from '@models'
import { ApiDataService } from '@services'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderService } from './deck-builder.service'
import { DeckBuilderStore, DeckBuilderState } from './deck-builder.store'

describe('Advent builder validation', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    TestBed.resetTestingModule()
    vi.useRealTimers()
  })

  async function setup(day?: number, load = true) {
    const state = {
      name: 'Advent2026: Test',
      published: true,
      extra: (day
        ? { advent: { year: 2026, day, title: '', content: '' } }
        : {}) as ApiDeckExtra,
      cards: [
        { id: 200001, number: 12 },
        { id: 100001, number: 60 },
      ] as ApiCard[],
      cryptErrors: [] as string[],
      libraryErrors: [] as string[],
    }
    const api = {
      getDeckBuilderArchetype: vi.fn<
        (deck: ApiDeckBuilder) => Observable<ApiDeckArchetype | null>
      >(() => of({ id: 1 } as ApiDeckArchetype | null)),
      getDeck: vi.fn<(id: string) => Observable<ApiDeck>>(() =>
        of({
          crypt: [{ id: 200001, number: 1 }],
          library: [{ id: 100001, number: 1 }],
        } as ApiDeck),
      ),
      saveDeckBuilder: vi.fn(() => of({})),
    }
    const active = () => state.cards.filter((card) => card.number > 0)
    const store = {
      getValue: () => state,
      getLoading: () => false,
      update: (fn: (value: DeckBuilderState) => Partial<DeckBuilderState>) =>
        Object.assign(state, fn(state as DeckBuilderState)),
      setCryptErrors: (errors: string[]) => (state.cryptErrors = errors),
      setLibraryErrors: (errors: string[]) => (state.libraryErrors = errors),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: DeckBuilderStore, useValue: store },
        {
          provide: DeckBuilderQuery,
          useValue: {
            getValue: () => state,
            getName: () => state.name,
            getPublished: () => state.published,
            getCryptClans: () => ['Gangrel'],
            getLimitedFormat: () => undefined,
            getCryptSize: () =>
              active()
                .filter((c) => c.id >= 200000)
                .reduce((sum, c) => sum + c.number, 0),
            getLibrarySize: () =>
              active()
                .filter((c) => c.id < 200000)
                .reduce((sum, c) => sum + c.number, 0),
            getCrypt: () =>
              active()
                .filter((c) => c.id >= 200000)
                .map((c) => ({
                  id: c.id,
                  type: 'Vampire',
                  clan: 'Gangrel',
                  group: 6,
                })),
            getLibrary: () =>
              active()
                .filter((c) => c.id < 200000)
                .map((c) => ({ id: c.id, types: [], disciplines: [] })),
            getCardNumber: (id: number) =>
              state.cards.find((c) => c.id === id)?.number ?? 0,
          },
        },
        { provide: ApiDataService, useValue: api },
        { provide: LibraryQuery, useValue: {} },
        { provide: CollectionApiDataService, useValue: {} },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
    const service = TestBed.inject(DeckBuilderService)
    // The initial validation starts the deferred import. Wait for the module,
    // without advancing the remote-check debounce.
    if (load) {
      service.validateDeck()
      await vi.dynamicImportSettled()
    }
    return { service, state, api }
  }

  it('blocks while pending, ignores stale responses, and accepts only the requested archetype', async () => {
    const { service, state, api } = await setup(3)
    const first = new Subject<ApiDeckArchetype | null>()
    const second = new Subject<ApiDeckArchetype | null>()
    api.getDeckBuilderArchetype
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    expect(service.validateDeck()).toBe(false)
    await expect(firstValueFrom(service.saveDeck())).rejects.toThrow()
    expect(api.saveDeckBuilder).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(350)
    state.cards = [
      { id: 200001, number: 12 },
      { id: 100002, number: 60 },
    ]
    service.validateDeck()
    first.next({ id: 1 } as ApiDeckArchetype)
    expect(state.libraryErrors).toContain(ADVENT_2026_ERRORS['pending'])
    await vi.advanceTimersByTimeAsync(350)
    second.next({ id: 3 } as ApiDeckArchetype)
    expect(
      state.libraryErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    state.cards = [...state.cards, { id: 100003, number: 1 }]
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toEqual([])
    expect(api.getDeckBuilderArchetype.mock.calls[2][0].cards).toEqual(
      state.cards,
    )
  })

  it('validates ordinary decks without any event requests', async () => {
    const { service, state, api } = await setup()
    state.name = 'My tournament deck'
    expect(service.validateDeck()).toBe(true)
    state.cards[1].number = 59
    expect(service.validateDeck()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.getDeck).not.toHaveBeenCalled()
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
    expect(state.libraryErrors).not.toContain(ADVENT_2026_ERRORS['name'])
  })

  it('initializes challenge metadata after loading the event service', async () => {
    const { service, state } = await setup(undefined, false)
    state.name = ''
    const initialized = service.initAdventRules('2026', '2')
    expect(service.validateDeck()).toBe(false)
    await initialized
    expect(state).toMatchObject({
      name: 'Advent2026: ',
      description: expect.stringContaining('New Blood: Salubri'),
      extra: { advent: { year: 2026, day: 2, title: 'New Blood: Salubri' } },
    })
    expect(state.libraryErrors).toContain(ADVENT_2026_ERRORS['pending'])
  })

  it('restores the previous edition validators from saved metadata', async () => {
    const { service, state, api } = await setup(undefined, false)
    state.name = 'Advent2025: Winter deck'
    state.extra.advent = { year: 2025, day: 1, title: '', content: '' }
    expect(service.validateDeck()).toBe(false)
    await vi.dynamicImportSettled()
    expect(service.validateDeck()).toBe(true)
    expect(state.extra.advent.title).toBe('Clan of the First Snow')
    expect(api.getDeck).not.toHaveBeenCalled()
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
  })

  it('rejects no match and handles errors with an explicit retry', async () => {
    const { service, state, api } = await setup(3)
    api.getDeckBuilderArchetype
      .mockReturnValueOnce(of(null))
      .mockReturnValueOnce(throwError(() => new Error('offline')))
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(
      state.libraryErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    state.cards[1] = { id: 100001, number: 61 }
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toContain(ADVENT_2026_ERRORS['unavailable'])
    service.validateDeck(true)
    expect(state.libraryErrors).toContain(ADVENT_2026_ERRORS['pending'])
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toEqual([])
  })

  it('fetches each specific product and calculates release shares locally', async () => {
    const { service, state, api } = await setup(14)
    state.cards = [
      { id: 200001, number: 12 },
      { id: 100001, number: 14 },
      { id: 100002, number: 46 },
    ]
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toEqual([])
    expect(api.getDeck).toHaveBeenLastCalledWith(
      'preconstructed-secrets_of_new_york',
    )
    state.extra.advent!.day = 2
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(
      state.libraryErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    expect(api.getDeck).toHaveBeenLastCalledWith(
      'preconstructed-first_blood_salubri',
    )
    state.cards[1].number = 24
    state.cards[2].number = 36
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toEqual([])
    expect(api.getDeck).toHaveBeenCalledTimes(2)
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
  })

  it('fails closed for empty release data, and cancels pending work when leaving a remote challenge', async () => {
    const { service, state, api } = await setup(18)
    api.getDeck.mockReturnValueOnce(
      of({ crypt: [], library: [] } as unknown as ApiDeck),
    )
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.libraryErrors).toContain(ADVENT_2026_ERRORS['unavailable'])
    service.validateDeck(true)
    state.extra.advent!.day = 24
    expect(service.validateDeck()).toBe(true)
    await vi.advanceTimersByTimeAsync(350)
    expect(api.getDeck).toHaveBeenCalledTimes(1)
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
  })

  it('keeps classic rules and day 24 fully local while enforcing normal legality', async () => {
    const { service, state, api } = await setup(1)
    expect(service.validateDeck()).toBe(true)
    state.extra.advent!.day = 24
    expect(service.validateDeck()).toBe(true)
    state.cards[1].number = 59
    expect(service.validateDeck()).toBe(false)
    expect(api.getDeck).not.toHaveBeenCalled()
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
  })
})
