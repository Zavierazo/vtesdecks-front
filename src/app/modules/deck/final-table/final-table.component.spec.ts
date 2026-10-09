import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { ApiDeck, ApiDecks } from '@models'
import { ApiDataService } from '@services'
import { of, Subject, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinalTableComponent } from './final-table.component'

const deck = (id: string, finalSeat: number, eventId = 'event') =>
  ({ id, name: id, author: 'Author', finalSeat, eventId }) as ApiDeck

describe('FinalTableComponent', () => {
  afterEach(() => TestBed.resetTestingModule())

  async function setup() {
    const getDecks = vi.fn(() =>
      of({ decks: [deck('one', 1), deck('two', 2)] } as ApiDecks),
    )
    await TestBed.configureTestingModule({
      imports: [
        FinalTableComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              deck: {
                final_table: 'Final table',
                view_final_table: 'View final table · 5 seats',
                final_table_description: 'Clockwise seating',
                seat: 'Seat {{ number }}',
                decklist_unavailable: 'Decklist unavailable',
              },
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: ApiDataService, useValue: { getDecks } },
      ],
    }).compileComponents()
    const fixture = TestBed.createComponent(FinalTableComponent)
    fixture.componentRef.setInput('deck', deck('one', 1))
    await fixture.whenStable()
    return { fixture, getDecks }
  }

  it('loads five seats, starts collapsed, and toggles through the heading', async () => {
    const { fixture, getDecks } = await setup()
    expect(getDecks).toHaveBeenCalledWith(0, 5, {
      eventId: 'event',
      minPosition: 1,
      maxPosition: 5,
    })
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button')
    const content: HTMLElement = fixture.nativeElement.querySelector(
      '#final-table-content',
    )
    expect(button.textContent).toContain('View final table · 5 seats')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(content.hidden).toBe(true)
    expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(5)
    button.click()
    await fixture.whenStable()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(content.hidden).toBe(false)
    button.click()
    await fixture.whenStable()
    expect(content.hidden).toBe(true)
  })

  it('collapses on deck navigation without refetching the same event', async () => {
    const { fixture, getDecks } = await setup()
    fixture.componentInstance.expanded.set(true)
    fixture.componentRef.setInput('deck', deck('two', 2))
    await fixture.whenStable()
    expect(fixture.componentInstance.expanded()).toBe(false)
    expect(getDecks).toHaveBeenCalledTimes(1)
    expect(
      fixture.nativeElement.querySelector('.border-primary').textContent,
    ).toContain('two')
  })

  it('clears the old table while a different event loads', async () => {
    const { fixture, getDecks } = await setup()
    const response = new Subject<ApiDecks>()
    getDecks.mockReturnValue(response)
    fixture.componentRef.setInput('deck', deck('other', 1, 'other-event'))
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('section')).toBeNull()
    response.next({ decks: [deck('other', 1)] } as ApiDecks)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('section')).toBeNull()
  })

  it('hides the table for missing events and failed requests', async () => {
    const { fixture, getDecks } = await setup()
    fixture.componentRef.setInput('deck', deck('none', 1, ''))
    await fixture.whenStable()
    expect(getDecks).toHaveBeenCalledTimes(1)
    expect(fixture.nativeElement.querySelector('section')).toBeNull()
    getDecks.mockReturnValue(throwError(() => new Error('Unavailable')))
    fixture.componentRef.setInput('deck', deck('other', 1, 'other-event'))
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('section')).toBeNull()
  })
})
