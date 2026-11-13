import { signal } from '@angular/core'
import { convertToParamMap } from '@angular/router'
import { ApiCrypt, ApiLibrary } from '@models'
import { ApiCard } from '@models'
import { BehaviorSubject, firstValueFrom, of, Subject, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { BuilderComponent } from './builder.component'

describe('Builder recommendation refresh', () => {
  it('immediately forwards each distinct edit to the cancellable refresh pipeline', () => {
    const cards = new Subject<ApiCard[]>()
    const fetchSuggestedCards = vi.fn()
    const context = Object.assign(Object.create(BuilderComponent.prototype), {
      initForm: vi.fn(),
      initDeck: () => of({}),
      deckBuilderQuery: {
        selectCards: () => cards,
        getValue: () => ({ cards: [] }),
      },
      deckBuilderService: { fetchSuggestedCards },
    }) as BuilderComponent

    context.ngOnInit()
    // The first observable emission can already contain an edit.
    cards.next([{ id: 200001, number: 1 }])
    expect(fetchSuggestedCards).toHaveBeenCalledExactlyOnceWith()

    cards.next([{ id: 200001, number: 2 }])
    cards.next([{ id: 200001, number: 3 }])
    // Unrelated store emissions must not restart the timer.
    cards.next([{ id: 200001, number: 3 }])
    expect(fetchSuggestedCards).toHaveBeenCalledTimes(3)
    cards.complete()
  })
})

describe('Builder catalog initialization', () => {
  it('keeps the editing session when a first save adds the deck ID to the URL', () => {
    const queryParams = new BehaviorSubject(convertToParamMap({}))
    let deckId: string | undefined
    const init = vi.fn((id: string | undefined) => {
      deckId = id
      return of({ id })
    })
    const context = {
      route: { queryParamMap: queryParams },
      deckBuilderQuery: { getDeckId: () => deckId, getSaved: () => true },
      deckBuilderService: { init, migrateLegacyDrafts: vi.fn() },
      cryptService: { getCryptCards: () => of([]) },
      libraryService: { getLibraryCards: () => of([]) },
      initializing: signal(false),
      form: { disable: vi.fn() },
      onDeckLoaded: vi.fn(),
      openLocalDrafts: vi.fn(),
    }
    const subscription = BuilderComponent.prototype.initDeck
      .call(context as unknown as BuilderComponent)
      .subscribe()

    expect(init).toHaveBeenCalledTimes(1)
    deckId = 'first-save'
    queryParams.next(convertToParamMap({ id: deckId }))
    expect(init).toHaveBeenCalledTimes(1)

    queryParams.next(convertToParamMap({ id: 'another-deck' }))
    expect(init.mock.calls.map(([id]) => id)).toEqual([
      undefined,
      'another-deck',
    ])

    // Cloning clears the store ID while the URL still points to the source deck.
    deckId = undefined
    queryParams.next(convertToParamMap({}))
    expect(init.mock.calls.map(([id]) => id)).toEqual([
      undefined,
      'another-deck',
      undefined,
    ])
    subscription.unsubscribe()
  })

  it('waits for Advent initialization before updating the form or saving the draft', async () => {
    const previousState = history.state
    history.replaceState({ advent: 2026, day: 2 }, '')
    let completeAdvent!: () => void
    const ready = new Promise<void>((resolve) => {
      completeAdvent = resolve
    })
    const loaded = vi.fn()
    const saveDraft = vi.fn()
    const context = {
      route: { queryParamMap: of(convertToParamMap({})) },
      deckBuilderQuery: { getDeckId: () => undefined, getSaved: () => false },
      deckBuilderService: {
        init: () => of({}),
        initAdventRules: vi.fn(() => ready),
        saveDraft,
      },
      cryptService: { getCryptCards: () => of([]) },
      libraryService: { getLibraryCards: () => of([]) },
      initializing: signal(false),
      activeLocalDraftId: () => undefined,
      form: { disable: vi.fn() },
      onDeckLoaded: loaded,
    }
    try {
      const result = firstValueFrom(
        BuilderComponent.prototype.initDeck.call(
          context as unknown as BuilderComponent,
        ),
      )
      expect(context.deckBuilderService.initAdventRules).toHaveBeenCalledWith(
        '2026',
        '2',
      )
      expect(loaded).not.toHaveBeenCalled()
      expect(saveDraft).not.toHaveBeenCalled()
      expect(context.initializing()).toBe(true)
      completeAdvent()
      await result
      expect(loaded).toHaveBeenCalledOnce()
      expect(saveDraft).toHaveBeenCalledOnce()
      expect(context.initializing()).toBe(false)
      expect(history.state.advent).toBeUndefined()
    } finally {
      history.replaceState(previousState, '')
    }
  })

  it('does not initialize from cached emissions and initializes once after both refreshes', () => {
    const crypt = new Subject<ApiCrypt[]>()
    const library = new Subject<ApiLibrary[]>()
    const init = vi.fn(() => of({ id: 'saved-deck' }))
    const loaded = vi.fn()
    const context = {
      route: { queryParamMap: of(convertToParamMap({ id: 'saved-deck' })) },
      deckBuilderQuery: { getDeckId: () => 'saved-deck', getSaved: () => true },
      deckBuilderService: { init },
      cryptService: { getCryptCards: () => crypt },
      libraryService: { getLibraryCards: () => library },
      initializing: signal(false),
      form: { disable: vi.fn() },
      onDeckLoaded: loaded,
    }
    const subscription = BuilderComponent.prototype.initDeck
      .call(context as unknown as BuilderComponent)
      .subscribe()
    crypt.next([])
    library.next([])
    expect(init).not.toHaveBeenCalled()
    expect(context.initializing()).toBe(true)
    crypt.next([{ id: 200001 } as ApiCrypt])
    crypt.complete()
    expect(init).not.toHaveBeenCalled()
    library.next([{ id: 100001 } as ApiLibrary])
    library.complete()
    expect(init).toHaveBeenCalledOnce()
    expect(loaded).toHaveBeenCalledOnce()
    expect(context.initializing()).toBe(false)
    subscription.unsubscribe()
  })
})

describe('Builder named saves', () => {
  it.each([
    'Refresh your browser. If the problem persists, contact support.',
    {
      message:
        'Refresh your browser. If the problem persists, contact support.',
    },
  ])(
    'shows any backend 400 message verbatim and preserves the draft: %j',
    (body) => {
      const error = { status: 400, error: body, message: 'Generic HTTP error' }
      const saveDeck = vi.fn(() => throwError(() => error))
      const show = vi.fn()
      const reset = vi.fn()
      const navigate = vi.fn()
      const onDeckLoaded = vi.fn()
      const translate = vi.fn((key: string) => key)
      const context = Object.assign(Object.create(BuilderComponent.prototype), {
        deckBuilderQuery: {
          getSaved: () => false,
          getName: () => 'Draft',
          getValidation: () => undefined,
          getPublished: () => false,
        },
        deckBuilderService: { validateDeck: vi.fn(), saveDeck },
        tagLabelControl: { value: 'Keep this version', reset },
        toastService: { show },
        translocoService: { translate },
        router: { navigate },
        onDeckLoaded,
      }) as BuilderComponent

      context.saveDeck()

      expect(show).toHaveBeenCalledExactlyOnceWith(
        'Refresh your browser. If the problem persists, contact support.',
        { classname: 'bg-danger text-light', delay: 10000 },
      )
      expect(saveDeck).toHaveBeenCalledExactlyOnceWith('Keep this version')
      expect(translate).not.toHaveBeenCalled()
      expect(reset).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalled()
      expect(onDeckLoaded).not.toHaveBeenCalled()
    },
  )

  it.each([true, false])(
    'preserves the version name unless saving succeeds: %s',
    (success) => {
      const reset = vi.fn()
      const saveDeck = vi.fn(() =>
        success ? of({}) : throwError(() => new Error('offline')),
      )
      const context = Object.assign(Object.create(BuilderComponent.prototype), {
        deckBuilderQuery: {
          getSaved: () => false,
          getName: () => 'Deck',
          getValidation: () => undefined,
          getPublished: () => false,
          getDeckId: () => 'deck',
        },
        deckBuilderService: { validateDeck: vi.fn(), saveDeck },
        tagLabelControl: { value: 'Tournament candidate', reset },
        toastService: { show: vi.fn() },
        translocoService: { translate: (key: string) => key },
        decksService: { reset: vi.fn() },
        router: { navigate: vi.fn() },
        onDeckLoaded: vi.fn(),
      }) as BuilderComponent
      context.saveDeck()
      expect(saveDeck).toHaveBeenCalledWith('Tournament candidate')
      expect(reset).toHaveBeenCalledTimes(success ? 1 : 0)
    },
  )
})
