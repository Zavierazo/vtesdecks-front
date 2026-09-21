import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ApiCard, ApiCrypt, ApiLibrary } from '@models'
import { MediaService, SpoilerVisitService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { BehaviorSubject, map, of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckCompositionPanelComponent } from './deck-composition-panel.component'

describe('Live deck composition panel', () => {
  afterEach(() => TestBed.resetTestingModule())

  async function setup(primary: 'crypt' | 'library' = 'library') {
    const cards = new BehaviorSubject<ApiCard[]>([
      { id: 200001, number: 4 },
      { id: 100001, number: 3 },
      { id: 100002, number: 0 },
      { id: 100003, number: 2 },
    ])
    const library = new BehaviorSubject<ApiLibrary[]>([
      { id: 100001, name: 'Action card', type: 'Action' } as ApiLibrary,
      { id: 100002, name: 'Considering master', type: 'Master' } as ApiLibrary,
    ])
    const addCard = vi.fn((id: number) =>
      cards.next(
        cards.value.map((c) =>
          c.id === id ? { ...c, number: c.number + 1 } : c,
        ),
      ),
    )
    const removeCard = vi.fn((id: number) =>
      cards.next(
        cards.value.map((c) =>
          c.id === id ? { ...c, number: c.number - 1 } : c,
        ),
      ),
    )
    const setCardQuantity = vi.fn((id: number, quantity: number) =>
      cards.next(
        cards.value.map((card) =>
          card.id === id ? { ...card, number: quantity } : card,
        ),
      ),
    )
    TestBed.configureTestingModule({
      imports: [
        DeckCompositionPanelComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        {
          provide: DeckBuilderQuery,
          useValue: {
            selectCards: () => cards,
            selectSuggestedCards: () =>
              of({
                keyLibrary: [{ id: 100001, min: 2, max: 4 }],
                keyCrypt: [],
              }),
            selectCryptDisciplines: () =>
              of([{ disciplines: ['Auspex'], superior: 2, inferior: 1 }]),
            selectLibraryDisciplines: () =>
              of([{ disciplines: ['Dominate'], superior: 0, inferior: 3 }]),
            selectCryptSortBy: () => of('capacity'),
            selectLibrarySortBy: () => of('quantity'),
          },
        },
        {
          provide: CryptQuery,
          useValue: {
            selectAll: () =>
              of([{ id: 200001, name: 'Vampire', capacity: 6 } as ApiCrypt]),
            selectEntity: () =>
              of({ id: 200001, name: 'Vampire', capacity: 6 } as ApiCrypt),
          },
        },
        {
          provide: LibraryQuery,
          useValue: {
            selectAll: () => library,
            selectEntity: (id: number) =>
              library.pipe(
                map((cards) => cards.find((card) => card.id === id)),
              ),
          },
        },
        {
          provide: DeckBuilderService,
          useValue: { addCard, removeCard, setCardQuantity },
        },
        { provide: MediaService, useValue: { observeMobile: () => of(false) } },
        { provide: SpoilerVisitService, useValue: { isNewCard: () => false } },
      ],
    })
    const fixture = TestBed.createComponent(DeckCompositionPanelComponent)
    fixture.componentRef.setInput('primarySection', primary)
    await fixture.whenStable()
    return {
      fixture,
      component: fixture.componentInstance,
      cards,
      library,
      addCard,
      removeCard,
      setCardQuantity,
    }
  }

  it('starts with the picker section expanded and toggles sections with collapsed statistics', async () => {
    const { component, fixture } = await setup()
    expect(component.sections().map((s) => s.type)).toEqual([
      'crypt',
      'library',
    ])
    expect(component.expandedSections()).toEqual({
      crypt: false,
      library: true,
    })
    expect(component.sections()[1].total).toBe(5)
    expect(
      fixture.nativeElement.querySelector('.discipline-summary').textContent,
    ).toContain('2 | 1')
    expect(fixture.nativeElement.textContent).toContain('#100003')
    expect(
      fixture.nativeElement.querySelector('.considering-card').textContent,
    ).toContain('Considering master')
    component.toggleSection('crypt')
    await fixture.whenStable()
    expect(component.expandedSections()).toEqual({ crypt: true, library: true })
    expect(
      fixture.nativeElement.querySelectorAll('.discipline-summary'),
    ).toHaveLength(2)
    component.toggleSection('library')
    await fixture.whenStable()
    expect(component.expandedSections()).toEqual({
      crypt: true,
      library: false,
    })
    expect(
      fixture.nativeElement.querySelectorAll('.discipline-summary')[1]
        .textContent,
    ).toContain('3')
    component.toggleSection('crypt')
    expect(component.expandedSections()).toEqual({
      crypt: false,
      library: false,
    })
    fixture.componentRef.setInput('primarySection', 'crypt')
    expect(component.expandedSections()).toEqual({
      crypt: true,
      library: false,
    })
  })

  it('updates through the builder service without replacing existing rows and reacts to catalog refresh', async () => {
    const {
      fixture,
      component,
      library,
      addCard,
      removeCard,
      setCardQuantity,
    } = await setup()
    const row = [
      ...fixture.nativeElement.querySelectorAll('.composition-row'),
    ].find((r: unknown) =>
      (r as HTMLElement).textContent?.includes('Action card'),
    ) as HTMLElement
    row.querySelector<HTMLButtonElement>('button:has(.bi-plus-square)')!.click()
    await fixture.whenStable()
    expect(addCard).toHaveBeenCalledWith(100001)
    expect(row.querySelector('app-recommended-badge')?.textContent).toContain(
      '2\u20134',
    )
    expect(component.sections()[1].total).toBe(6)
    expect(row.isConnected).toBe(true)
    expect(row.querySelector('.deck_number')?.textContent).toContain('4')
    row.querySelector<HTMLButtonElement>('button:has(.bi-dash-square)')!.click()
    await fixture.whenStable()
    expect(removeCard).toHaveBeenCalledWith(100001)
    row.querySelector<HTMLButtonElement>('app-card-quantity button')!.click()
    await fixture.whenStable()
    const field = row.querySelector('input')!
    field.value = '8'
    field.dispatchEvent(new FocusEvent('blur'))
    await fixture.whenStable()
    expect(setCardQuantity).toHaveBeenCalledExactlyOnceWith(100001, 8)
    expect(component.sections()[1].total).toBe(10)
    expect(row.isConnected).toBe(true)
    library.next([
      ...library.value,
      { id: 100003, name: 'Restored card', type: 'Reaction' } as ApiLibrary,
    ])
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Restored card')
    expect(fixture.nativeElement.textContent).not.toContain('#100003')
  })

  it('renders the standard Crypt list and handles empty decks', async () => {
    const { cards, component, fixture } = await setup('crypt')
    expect(
      fixture.nativeElement.querySelector('app-crypt .list-group-item'),
    ).not.toBeNull()
    cards.next([])
    await fixture.whenStable()
    expect(component.sections()[0].empty).toBe(true)
    expect(component.sections()[0].total).toBe(0)
  })
})
