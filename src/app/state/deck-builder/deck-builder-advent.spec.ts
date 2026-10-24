import { TestBed } from '@angular/core/testing'
import { ADVENT_2026, ADVENT_2026_ERRORS } from '@advent/advent-2026.data'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import {
  ApiCard,
  ApiDeck,
  ApiDeckBuilder,
  ApiDeckArchetype,
  ApiDeckExtra,
  MetaType,
} from '@models'
import { ApiDataService, ToastService } from '@services'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderService } from './deck-builder.service'
import { DeckBuilderStore, DeckBuilderState } from './deck-builder.store'
import adventEn from '../../../assets/i18n/advent/en.json'
import adventEs from '../../../assets/i18n/advent/es.json'

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
      deckErrors: [] as string[],
      cryptErrors: [] as string[],
      libraryErrors: [] as string[],
    }
    const api = {
      getDeckArchetype: vi.fn<
        (id: number, metaType?: MetaType) => Observable<ApiDeckArchetype>
      >((id) =>
        of({
          id,
          keyCrypt: [
            { id: 200001, appearanceRate: 1, number: 6, avg: 5.2 },
            { id: 200002, appearanceRate: 0.85, number: 2, avg: 2.1 },
            { id: 200003, appearanceRate: 0.8499, number: 4, avg: 3.8 },
          ],
          keyLibrary: [
            { id: 100001, appearanceRate: 0.95, number: 8, avg: 9.6 },
            { id: 100002, appearanceRate: 0.85, number: 6, avg: 5.4 },
            { id: 100003, appearanceRate: 0.8499, number: 20, avg: 20 },
            { id: 100004, appearanceRate: 1, number: 0, avg: 0 },
          ],
        } as ApiDeckArchetype),
      ),
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
    const toast = { show: vi.fn() }
    const active = () => state.cards.filter((card) => card.number > 0)
    const store = {
      getValue: () => state,
      getLoading: () => false,
      update: (fn: (value: DeckBuilderState) => Partial<DeckBuilderState>) =>
        Object.assign(state, fn(state as DeckBuilderState)),
      setDeckErrors: (errors: string[]) => (state.deckErrors = errors),
      setCryptErrors: (errors: string[]) => (state.cryptErrors = errors),
      setLibraryErrors: (errors: string[]) => (state.libraryErrors = errors),
    }
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {},
            es: {},
            'advent/en': adventEn,
            'advent/es': adventEs,
          },
          translocoConfig: {
            availableLangs: ['en', 'es'],
            defaultLang: 'en',
            reRenderOnLangChange: true,
            failedRetries: 0,
          },
        }),
      ],
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
        { provide: ToastService, useValue: toast },
        {
          provide: LibraryQuery,
          useValue: {
            getEntity: (id: number) => {
              const type = (
                { 100001: 'Master', 100002: 'Action/Combat' } as Record<
                  number,
                  string
                >
              )[id]
              return type ? { type } : undefined
            },
          },
        },
        { provide: CollectionApiDataService, useValue: {} },
      ],
    })
    const service = TestBed.inject(DeckBuilderService)
    // The initial validation starts the deferred import. Wait for the module,
    // without advancing the remote-check debounce.
    if (load) {
      service.validateDeck()
      await vi.dynamicImportSettled()
    }
    return {
      service,
      state,
      api,
      toast,
      transloco: TestBed.inject(TranslocoService),
    }
  }

  it.each([3, 7, 11, 15, 19, 22])(
    'starts day %s with cards used in at least 85% of the archetype, at their typical quantities',
    async (day) => {
      const { service, state, api } = await setup(undefined, false)
      state.cards = []
      state.name = ''
      await service.initAdventRules('2026', String(day))

      expect(api.getDeckArchetype).toHaveBeenCalledExactlyOnceWith(
        ADVENT_2026.days[day].archetypeId,
        'TOURNAMENT_365',
      )
      expect(api.getDeck).not.toHaveBeenCalled()
      expect(state.cards).toEqual([
        { id: 200001, number: 6 },
        { id: 200002, number: 2 },
        { id: 100001, number: 8, type: 'Master' },
        { id: 100002, number: 6, type: 'Action/Combat' },
      ])
      expect(state.name).toBe('Advent2026: ')
      const reference =
        adventEn.editions['2026'].days[
          String(day) as '3' | '7' | '11' | '15' | '19' | '22'
        ].reference
      expect(state).toMatchObject({
        description: expect.stringContaining(
          `[${reference}](/metagame/${ADVENT_2026.days[day].archetypeId})`,
        ),
      })
      expect(state.extra.advent).toMatchObject({
        year: 2026,
        day,
        title:
          adventEn.editions['2026'].days[
            String(day) as keyof (typeof adventEn.editions)['2026']['days']
          ].title,
      })
    },
  )

  it('seeds a new challenge when the Advent service has already loaded', async () => {
    const { service, state, api } = await setup(24)
    state.cards = []
    await service.initAdventRules('2026', '3')
    expect(api.getDeckArchetype).toHaveBeenCalledExactlyOnceWith(
      1,
      'TOURNAMENT_365',
    )
    expect(state.cards).toHaveLength(4)
  })

  it('keeps the starter editable without adding a submission rule', async () => {
    const { service, state, api } = await setup(undefined, false)
    state.cards = []
    api.getDeckArchetype.mockReturnValueOnce(
      of({
        keyCrypt: [{ id: 200001, appearanceRate: 1, number: 12 }],
        keyLibrary: [{ id: 100001, appearanceRate: 1, number: 60 }],
      } as ApiDeckArchetype),
    )
    await service.initAdventRules('2026', '3')
    await vi.advanceTimersByTimeAsync(350)
    expect(service.validateDeck()).toBe(true)

    state.cards[1] = { id: 100002, number: 60 }
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(service.validateDeck()).toBe(true)
    expect(state.deckErrors).toEqual([])
  })

  it.each(['existing cards', 'saved deck'])(
    'does not seed over %s',
    async (kind) => {
      const { service, state, api } = await setup(undefined, false)
      Object.assign(state, { description: 'My own strategy notes' })
      if (kind === 'saved deck') {
        Object.assign(state, { id: 'saved-deck', cards: [] })
      }
      const cards = state.cards
      await service.initAdventRules('2026', '3')
      expect(state.cards).toBe(cards)
      expect(state).toMatchObject({ description: 'My own strategy notes' })
      expect(api.getDeckArchetype).not.toHaveBeenCalled()
    },
  )

  it.each([1, 2, 24])('does not seed non-archetype day %s', async (day) => {
    const { service, state, api } = await setup(undefined, false)
    state.cards = []
    await service.initAdventRules('2026', String(day))
    expect(state.cards).toEqual([])
    expect(api.getDeckArchetype).not.toHaveBeenCalled()
  })

  it.each(['edit cards', 'open another deck'])(
    'ignores a late starter after %s',
    async (action) => {
      const { service, state, api } = await setup(undefined, false)
      state.cards = []
      const response = new Subject<ApiDeckArchetype>()
      api.getDeckArchetype.mockReturnValueOnce(response)
      const initialized = service.initAdventRules('2026', '3')
      await vi.dynamicImportSettled()
      expect(api.getDeckArchetype).toHaveBeenCalledOnce()
      const cards = [{ id: 200003, number: 4 }]
      state.cards = cards
      if (action === 'open another deck') {
        state.extra = {}
        state.name = 'Another deck'
      }
      response.next({
        keyCrypt: [{ id: 200001, appearanceRate: 1, number: 12 }],
      } as ApiDeckArchetype)
      response.complete()
      await initialized
      expect(state.cards).toBe(cards)
      if (action === 'open another deck') {
        expect(state.extra.advent).toBeUndefined()
        expect(state.name).toBe('Another deck')
      }
    },
  )

  it('reports an unavailable starter and leaves the challenge editable', async () => {
    const { service, state, api, toast } = await setup(undefined, false)
    state.cards = []
    api.getDeckArchetype.mockReturnValueOnce(
      throwError(() => new Error('offline')),
    )
    await service.initAdventRules('2026', '3')
    expect(state.cards).toEqual([])
    expect(state.extra.advent).toMatchObject({ year: 2026, day: 3 })
    expect(toast.show).toHaveBeenCalledExactlyOnceWith(
      'shared.error_loading_data',
      expect.any(Object),
    )
  })

  it('blocks while pending, ignores stale responses, and accepts only the requested archetype', async () => {
    const { service, state, api } = await setup(3)
    const first = new Subject<ApiDeckArchetype | null>()
    const second = new Subject<ApiDeckArchetype | null>()
    api.getDeckBuilderArchetype
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual([])
    expect(state.cryptErrors).toEqual([])
    expect(state.libraryErrors).toEqual([])
    await expect(firstValueFrom(service.saveDeck())).rejects.toThrow()
    expect(api.saveDeckBuilder).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(350)
    state.cards = [
      { id: 200001, number: 12 },
      { id: 100002, number: 60 },
    ]
    service.validateDeck()
    first.next({ id: 1 } as ApiDeckArchetype)
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual([])
    await vi.advanceTimersByTimeAsync(350)
    second.next({ id: 3 } as ApiDeckArchetype)
    expect(
      state.deckErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    expect(state.deckErrors.join(' ')).toContain('href="/metagame/1"')
    expect(state.deckErrors.join(' ')).toContain('Gangrel Thing</a>')
    expect(state.deckErrors.join(' ')).toContain('target="_blank"')
    expect(state.deckErrors.join(' ')).toContain('Gangrel Thing')
    expect(state.deckErrors.join(' ')).toContain('best-matching archetype')
    expect(state.libraryErrors).toEqual([])
    const previousErrors = [...state.deckErrors]
    state.cards = [...state.cards, { id: 100003, number: 1 }]
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual(previousErrors)
    await vi.advanceTimersByTimeAsync(350)
    expect(service.validateDeck()).toBe(true)
    expect(state.deckErrors).toEqual([])
    expect(api.getDeckBuilderArchetype.mock.calls[2][0].cards).toEqual(
      state.cards,
    )
  })

  it.each([2, 3])(
    'keeps errors empty during repeated quantity edits while blocking saves for day %s',
    async (day) => {
      const { service, state, api } = await setup(day)
      await vi.advanceTimersByTimeAsync(350)
      expect(service.validateDeck()).toBe(true)

      for (const number of [61, 62, 63, 62, 61, 60]) {
        state.cards[1] = { id: 100001, number }
        expect(service.validateDeck()).toBe(false)
        expect(state.deckErrors).toEqual([])
        expect(state.cryptErrors).toEqual([])
        expect(state.libraryErrors).toEqual([])
        await expect(firstValueFrom(service.saveDeck())).rejects.toThrow()
        await vi.advanceTimersByTimeAsync(100)
      }
      expect(api.saveDeckBuilder).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(350)
      expect(service.validateDeck()).toBe(true)
      expect(state.deckErrors).toEqual([])
    },
  )

  it('keeps the release error visible during rechecks and clears it when changing challenges', async () => {
    const { service, state, api } = await setup(2)
    api.getDeck.mockReturnValueOnce(
      of({
        crypt: [{ id: 200001, number: 1 }],
        library: [],
      } as unknown as ApiDeck),
    )
    await vi.advanceTimersByTimeAsync(350)
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors.join(' ')).toContain('New Blood: Salubri</a>')
    const previousErrors = [...state.deckErrors]
    for (const number of [61, 62, 61, 60]) {
      state.cards[1] = { id: 100001, number }
      expect(service.validateDeck()).toBe(false)
      expect(state.deckErrors).toEqual(previousErrors)
      await vi.advanceTimersByTimeAsync(350)
      expect(state.deckErrors).toEqual(previousErrors)
    }

    state.extra.advent!.day = 3
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual([])
    await vi.advanceTimersByTimeAsync(350)
    expect(service.validateDeck()).toBe(true)
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
    expect(state.deckErrors).not.toContain(ADVENT_2026_ERRORS['name'])
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
      extra: {
        advent: {
          year: 2026,
          day: 2,
          title: adventEn.editions['2026'].days['2'].title,
        },
      },
    })
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors.join(' ')).not.toContain('Checking')
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

  it('uses the English catalog for new deck metadata in another language', async () => {
    const { service, state, transloco } = await setup(undefined, false)
    transloco.setActiveLang('es')
    state.name = ''
    await service.initAdventRules('2026', '6')
    expect(state.extra.advent).toMatchObject({
      title: adventEn.editions['2026'].days['6'].title,
      content: adventEn.editions['2026'].days['6'].content,
    })
    expect(transloco.getActiveLang()).toBe('es')
    expect(state.extra.advent!.content).not.toContain('Round up')
  })

  it('rejects no match and handles errors with an explicit retry', async () => {
    const { service, state, api } = await setup(3)
    api.getDeckBuilderArchetype
      .mockReturnValueOnce(of(null))
      .mockReturnValueOnce(throwError(() => new Error('offline')))
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(
      state.deckErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    state.cards[1] = { id: 100001, number: 61 }
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.deckErrors.join(' ')).toContain(
      ADVENT_2026_ERRORS['unavailable'],
    )
    expect(state.deckErrors.join(' ')).toContain('href="/metagame/1"')
    const previousErrors = [...state.deckErrors]
    expect(service.validateDeck(true)).toBe(false)
    expect(state.deckErrors).toEqual(previousErrors)
    await vi.advanceTimersByTimeAsync(350)
    expect(state.deckErrors).toEqual([])
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
    expect(state.deckErrors).toEqual([])
    expect(api.getDeck).toHaveBeenLastCalledWith(
      'preconstructed-secrets_of_new_york',
    )
    state.extra.advent!.day = 2
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(
      state.deckErrors.some((error) => error.startsWith('Advent rule:')),
    ).toBe(true)
    expect(api.getDeck).toHaveBeenLastCalledWith(
      'preconstructed-first_blood_salubri',
    )
    expect(state.deckErrors.join(' ')).toContain(
      'At least 50% of all card copies in your deck must appear in',
    )
    expect(state.deckErrors.join(' ')).toContain(
      'href="/deck/preconstructed-first_blood_salubri"',
    )
    expect(state.deckErrors.join(' ')).toContain(
      'New Blood: Salubri</a>. Count crypt and library copies together.',
    )
    expect(state.cryptErrors).toEqual([])
    expect(state.libraryErrors).toEqual([])
    state.cards[1].number = 24
    state.cards[2].number = 36
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    expect(state.deckErrors).toEqual([])
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
    expect(state.deckErrors.join(' ')).toContain(
      ADVENT_2026_ERRORS['unavailable'],
    )
    expect(state.deckErrors.join(' ')).toContain(
      'href="/deck/preconstructed-noites_brasileiras"',
    )
    service.validateDeck(true)
    state.extra.advent!.day = 24
    expect(service.validateDeck()).toBe(true)
    await vi.advanceTimersByTimeAsync(350)
    expect(api.getDeck).toHaveBeenCalledTimes(1)
    expect(api.getDeckBuilderArchetype).not.toHaveBeenCalled()
  })

  it('separates name and publication errors from card errors and clears them when resolved or leaving Advent', async () => {
    const { service, state } = await setup(24)
    state.name = 'My deck'
    state.published = false
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual([
      adventEn.validation.name,
      adventEn.validation.published,
    ])
    expect(state.cryptErrors).toEqual([])
    expect(state.libraryErrors).toEqual([])

    state.name = 'Advent2026: Test'
    state.published = true
    expect(service.validateDeck()).toBe(true)
    expect(state.deckErrors).toEqual([])

    state.name = 'My deck'
    expect(service.validateDeck()).toBe(false)
    delete state.extra.advent
    expect(service.validateDeck()).toBe(true)
    expect(state.deckErrors).toEqual([])
  })

  it('puts the first challenge failure under Crypt and clears it when the crypt qualifies', async () => {
    const { service, state } = await setup(1)
    const query = TestBed.inject(DeckBuilderQuery)
    const getCrypt = query.getCrypt.bind(query)
    vi.spyOn(query, 'getCrypt').mockImplementation(() =>
      getCrypt().map((card) => ({
        ...card,
        clan: card.id === 200001 ? 'Gangrel' : 'Toreador',
      })),
    )
    state.cards = [
      { id: 200001, number: 8 },
      { id: 200002, number: 4 },
      { id: 100001, number: 60 },
    ]
    expect(service.validateDeck()).toBe(false)
    expect(state.cryptErrors).toEqual([
      adventEn.validation.rule.replace(
        '{{rule}}',
        adventEn.editions['2026'].days['1'].content,
      ),
    ])
    expect(state.deckErrors).toEqual([])
    expect(state.libraryErrors).toEqual([])

    state.cards[0].number = 9
    state.cards[1].number = 3
    expect(service.validateDeck()).toBe(true)
    expect(state.cryptErrors).toEqual([])
    expect(state.libraryErrors).toEqual([])
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

  it('does not load Advent translations for an ordinary deck, including after leaving Advent', async () => {
    const { service, state, transloco } = await setup(undefined, false)
    const load = vi.spyOn(transloco, 'load')
    service.validateDeck()
    expect(load).not.toHaveBeenCalled()
    state.extra.advent = { year: 2026, day: 24, title: '', content: '' }
    service.validateDeck()
    await vi.dynamicImportSettled()
    expect(load).toHaveBeenCalledWith('advent/en')
    delete state.extra.advent
    service.validateDeck()
    load.mockClear()
    transloco.setActiveLang('es')
    service.validateDeck()
    expect(load).not.toHaveBeenCalled()
  })

  it('updates local and remote validation messages on language changes without editing saved text', async () => {
    const { service, state, api, transloco } = await setup(3)
    api.getDeckBuilderArchetype.mockReturnValue(of(null))
    state.name = 'My deck'
    service.validateDeck()
    await vi.advanceTimersByTimeAsync(350)
    const metadata = { ...state.extra.advent }
    transloco.setActiveLang('es')
    expect(state.deckErrors).toContain(adventEs.validation.name)
    expect(state.deckErrors.join(' ')).toContain(
      adventEs.validation.archetype.split('{{reference}}')[0],
    )
    expect(state.deckErrors.join(' ')).toContain(
      'Gangrel Thing</a> como el arquetipo',
    )
    expect(state.name).toBe('My deck')
    expect(state.extra.advent).toEqual(metadata)
    state.name = 'Advent2026: Test'
    state.extra.advent!.day = 5
    service.validateDeck()
    expect(state.libraryErrors).toContain(
      adventEs.validation.rule.replace(
        '{{rule}}',
        adventEs.editions['2026'].days['5'].content,
      ),
    )
    expect(state.deckErrors).toEqual([])
  })

  it('blocks validation while translations load or fail, and retries on Save', async () => {
    const { service, state, transloco } = await setup(24, false)
    const pending = new Subject<Record<string, unknown>>()
    const load = vi.spyOn(transloco, 'load').mockReturnValueOnce(pending)
    service.validateDeck()
    await vi.dynamicImportSettled()
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toEqual([])
    pending.error(new Error('offline'))
    expect(service.validateDeck()).toBe(false)
    expect(state.deckErrors).toContain('shared.error_loading_data')
    expect(load).toHaveBeenCalledTimes(1)
    expect(service.validateDeck(true)).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
