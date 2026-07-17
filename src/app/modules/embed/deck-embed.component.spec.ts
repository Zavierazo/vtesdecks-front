import { ElementRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { ApiCrypt, ApiDeck, ApiLibrary } from '@models'
import { ApiDataService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { DeckQuery } from '@state/deck/deck.query'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { firstValueFrom, of } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeckEmbedComponent } from './deck-embed.component'

const deckFixture = {
  id: 'tournament-1',
  name: 'Test Deck',
  author: 'Author',
  clanIcons: [],
  disciplineIcons: [],
  crypt: [
    { id: 1, number: 3 },
    { id: 2, number: 1 },
  ],
  library: [
    { id: 10, number: 4, type: 'Master' },
    { id: 11, number: 2, type: 'Action' },
    { id: 12, number: 1, type: 'Master' },
  ],
  stats: { crypt: 4, library: 7 },
} as unknown as ApiDeck

const cryptEntities: Record<number, Partial<ApiCrypt>> = {
  1: { id: 1, name: 'Small Vampire', capacity: 3 },
  2: { id: 2, name: 'Big Vampire', capacity: 9 },
}

const libraryEntities: Record<number, Partial<ApiLibrary>> = {
  10: { id: 10, name: 'Vessel' },
  11: { id: 11, name: 'Bum Rush' },
  12: { id: 12, name: 'Ashur Tablets' },
}

describe('DeckEmbedComponent', () => {
  let matchMediaListeners: ((event: { matches: boolean }) => void)[]
  let matchMediaMatches: boolean

  /** Host element with a rendered size (jsdom rects are always 0). */
  function hostElement(): HTMLElement {
    const element = document.createElement('div')
    element.getBoundingClientRect = () =>
      ({ top: 0, bottom: 300, height: 300 }) as DOMRect
    return element
  }

  function setup(queryParams: Record<string, string> = {}) {
    TestBed.resetTestingModule()
    matchMediaListeners = []
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matchMediaMatches
        },
        addEventListener: (_: string, listener: never) =>
          matchMediaListeners.push(listener),
        removeEventListener: vi.fn(),
      })),
    )
    const deckView = vi.fn(() => of(true))
    const setActiveLang = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map([['id', 'tournament-1']]),
              queryParamMap: new Map(Object.entries(queryParams)),
            },
          },
        },
        { provide: DeckQuery, useValue: { selectDeck: () => of(deckFixture) } },
        {
          provide: CryptQuery,
          useValue: {
            selectAll: () => of([]),
            getEntity: (id: number) => cryptEntities[id],
          },
        },
        {
          provide: LibraryQuery,
          useValue: {
            selectAll: () => of([]),
            getEntity: (id: number) => libraryEntities[id],
          },
        },
        { provide: CryptService, useValue: { getCryptCards: () => of([]) } },
        {
          provide: LibraryService,
          useValue: { getLibraryCards: () => of([]) },
        },
        { provide: ApiDataService, useValue: { deckView } },
        {
          provide: TranslocoService,
          useValue: {
            setActiveLang,
            translate: (key: string) => `t:${key}`,
            selectTranslation: () => of({}),
          },
        },
        {
          provide: ElementRef,
          useValue: new ElementRef(hostElement()),
        },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new DeckEmbedComponent(),
    )
    return { component, deckView, setActiveLang }
  }

  beforeEach(() => {
    matchMediaMatches = false
  })

  afterEach(() => {
    document.body.removeAttribute('data-bs-theme')
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('shows every section by default', () => {
    const { component } = setup()
    component.ngOnInit()
    expect(component.sections).toEqual({
      stats: true,
      crypt: true,
      library: true,
    })
  })

  it('only enables the sections listed in the query param', () => {
    const { component } = setup({ sections: 'stats' })
    component.ngOnInit()
    expect(component.sections).toEqual({
      stats: true,
      crypt: false,
      library: false,
    })
  })

  it('shows only the header when the sections param is empty', () => {
    const { component } = setup({ sections: '' })
    component.ngOnInit()
    expect(component.sections).toEqual({
      stats: false,
      crypt: false,
      library: false,
    })
  })

  it('applies an explicit theme to the body', () => {
    const { component } = setup({ theme: 'dark' })
    component.ngOnInit()
    expect(document.body.getAttribute('data-bs-theme')).toBe('dark')
  })

  it('falls back to prefers-color-scheme for auto or invalid themes', () => {
    matchMediaMatches = true
    const { component } = setup({ theme: 'bogus' })
    component.ngOnInit()
    expect(document.body.getAttribute('data-bs-theme')).toBe('dark')
    matchMediaMatches = false
    matchMediaListeners.forEach((listener) => listener({ matches: false }))
    expect(document.body.getAttribute('data-bs-theme')).toBe('light')
  })

  it('activates a supported lang and ignores unsupported ones', () => {
    const { component, setActiveLang } = setup({ lang: 'es' })
    component.ngOnInit()
    expect(setActiveLang).toHaveBeenCalledWith('es')

    const second = setup({ lang: 'xx' })
    second.component.ngOnInit()
    expect(second.setActiveLang).not.toHaveBeenCalled()
  })

  it('builds crypt rows sorted by capacity and grouped library lists', async () => {
    const { component } = setup()
    component.ngOnInit()
    const vm = await firstValueFrom(component.vm$)
    expect(vm?.cryptRows.map((row) => row.name)).toEqual([
      'Big Vampire',
      'Small Vampire',
    ])
    expect(vm?.libraryGroups.map((group) => group.type)).toEqual([
      'Master',
      'Action',
    ])
    expect(vm?.libraryGroups[0].count).toBe(5)
    expect(vm?.libraryGroups[0].rows.map((row) => row.name)).toEqual([
      'Ashur Tablets',
      'Vessel',
    ])
    expect(vm?.libraryGroups[0].label).toBe('t:vtes.type.master')
  })

  it('places the hover image above or below the row, never over it', () => {
    const { component } = setup()
    const rowEvent = (top: number, bottom: number) =>
      ({
        clientX: 50,
        clientY: (top + bottom) / 2,
        currentTarget: {
          getBoundingClientRect: () => ({ top, bottom }),
        },
      }) as unknown as MouseEvent

    // Row near the top → image goes below the row (jsdom innerHeight = 768)
    component.onRowEnter(rowEvent(20, 40), 'https://cdn/card.jpg')
    let preview = component.hoverPreview()!
    expect(preview.top).toBeGreaterThanOrEqual(40)

    // Row near the bottom → image goes fully above the row
    component.onRowEnter(rowEvent(700, 720), 'https://cdn/card.jpg')
    preview = component.hoverPreview()!
    expect(preview.top + preview.maxHeight).toBeLessThanOrEqual(700)

    component.onRowLeave()
    expect(component.hoverPreview()).toBeNull()
  })

  it('posts its height to the parent window', () => {
    const { component } = setup()
    component.ngOnInit()
    const postMessage = vi.fn()
    const originalParent = window.parent
    Object.defineProperty(window, 'parent', {
      value: { postMessage },
      configurable: true,
    })
    try {
      component.postHeight()
    } finally {
      Object.defineProperty(window, 'parent', {
        value: originalParent,
        configurable: true,
      })
    }
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'vtesdecks-embed-resize',
        deckId: 'tournament-1',
        height: expect.any(Number),
      }),
      '*',
    )
  })

  it('tracks the deck view after 10 seconds with an embed source', () => {
    vi.useFakeTimers()
    const { component, deckView } = setup()
    component.ngOnInit()
    component.ngAfterViewInit()
    expect(deckView).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10000)
    expect(deckView).toHaveBeenCalledWith(
      'tournament-1',
      expect.stringMatching(/^embed:/),
    )
  })
})
