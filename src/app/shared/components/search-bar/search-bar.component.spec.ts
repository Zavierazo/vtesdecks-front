import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import {
  ApiCrypt,
  ApiDeck,
  ApiSearchArchetype,
  ApiSearchResponse,
} from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { of } from 'rxjs'
import { SearchBarComponent } from './search-bar.component'

describe('SearchBarComponent', () => {
  let navigate: ReturnType<typeof vi.fn>
  let close: ReturnType<typeof vi.fn>
  let search: ReturnType<typeof vi.fn>

  const archetype: ApiSearchArchetype = {
    id: 12,
    name: 'Alpha Wall',
    icon: 'ventrue',
    type: 'Wall',
  }

  function setup(response?: ApiSearchResponse) {
    navigate = vi.fn()
    close = vi.fn()
    search = vi.fn(() =>
      of(
        response ?? {
          cards: [],
          archetypes: [archetype],
          decks: [],
          users: [],
        },
      ),
    )

    TestBed.configureTestingModule({
      imports: [
        SearchBarComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              search_bar: {
                search_placeholder: 'Search',
                no_results: 'No results found',
                card_results: 'Card Results',
                archetype_results: 'Archetype Results',
                deck_results: 'Deck Results',
                user_results: 'User Results',
                to_select: 'to select',
                to_navigate: 'to navigate',
                to_close: 'to close',
              },
            },
          },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
          },
        }),
      ],
      providers: [
        { provide: ApiDataService, useValue: { search } },
        { provide: Router, useValue: { navigate } },
        { provide: NgbActiveModal, useValue: { close } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
        { provide: CryptQuery, useValue: { getEntity: vi.fn() } },
        { provide: LibraryQuery, useValue: { getEntity: vi.fn() } },
      ],
    })

    const fixture = TestBed.createComponent(SearchBarComponent)
    fixture.detectChanges()
    return fixture
  }

  afterEach(() => {
    vi.useRealTimers()
    TestBed.resetTestingModule()
  })

  it('loads and renders archetype results', async () => {
    vi.useFakeTimers()
    const fixture = setup()

    fixture.componentInstance.queryControl.setValue('alpha')
    await vi.advanceTimersByTimeAsync(300)
    fixture.detectChanges()

    expect(search).toHaveBeenCalledWith('alpha')
    expect(fixture.componentInstance.archetypeResults()).toEqual([archetype])
    expect(fixture.nativeElement.textContent).toContain('Archetype Results')
    expect(fixture.nativeElement.textContent).toContain('Alpha Wall')
    expect(fixture.nativeElement.textContent).toContain('(Wall)')
    const icon = fixture.nativeElement.querySelector('i.vtes') as HTMLElement
    expect(getComputedStyle(icon).flexGrow).toBe('0')
    expect(getComputedStyle(icon).flexShrink).toBe('0')
  })

  it('treats a response without archetypes as an empty archetype result', async () => {
    vi.useFakeTimers()
    const fixture = setup({ cards: [], decks: [], users: [] })

    fixture.componentInstance.queryControl.setValue('alpha')
    await vi.advanceTimersByTimeAsync(300)
    fixture.detectChanges()

    expect(fixture.componentInstance.archetypeResults()).toEqual([])
    expect(fixture.nativeElement.textContent).toContain('No results found')
  })

  it('opens an archetype from its rendered result', () => {
    const fixture = setup()
    fixture.componentInstance.archetypeResults.set([archetype])
    fixture.detectChanges()

    const result = fixture.nativeElement.querySelector(
      '.search-result-item',
    ) as HTMLButtonElement
    result.click()

    expect(navigate).toHaveBeenCalledWith(['metagame', 12])
    expect(close).toHaveBeenCalled()
  })

  it('includes archetypes in keyboard selection offsets', () => {
    vi.useFakeTimers()
    const fixture = setup()
    fixture.componentInstance.cardResults.set([
      { id: 1, name: 'Alpha Card' } as ApiCrypt,
    ])
    fixture.componentInstance.archetypeResults.set([archetype])
    fixture.componentInstance.deckResults.set([
      { id: 'deck-1', name: 'Alpha Deck' } as ApiDeck,
    ])
    fixture.componentInstance.onKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    )
    fixture.componentInstance.onKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    )

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    fixture.componentInstance.onKeydown(event)

    expect(fixture.componentInstance.selectedIndex()).toBe(1)
    expect(navigate).toHaveBeenCalledWith(['metagame', 12])
    expect(close).toHaveBeenCalled()
  })
})
