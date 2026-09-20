import { signal } from '@angular/core'
import { convertToParamMap } from '@angular/router'
import { ApiCrypt, ApiLibrary } from '@models'
import { ApiCard } from '@models'
import { of, Subject } from 'rxjs'
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
