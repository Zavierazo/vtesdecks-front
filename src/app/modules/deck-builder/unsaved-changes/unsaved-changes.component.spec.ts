import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { of } from 'rxjs'
import { afterEach, describe, expect, it } from 'vitest'
import { UnsavedChangesComponent } from './unsaved-changes.component'
import en from '../../../../assets/i18n/en.json'

describe('Unsaved card changes', () => {
  afterEach(() => TestBed.resetTestingModule())
  function setup() {
    TestBed.configureTestingModule({
      imports: [
        UnsavedChangesComponent,
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        {
          provide: CryptQuery,
          useValue: { selectAll: () => of([{ id: 200001, name: 'Vampire' }]) },
        },
        {
          provide: LibraryQuery,
          useValue: {
            selectAll: () =>
              of([
                {
                  id: 100001,
                  name: 'Deflection',
                  i18n: { name: 'Translated Deflection' },
                },
              ]),
          },
        },
      ],
    })
    const fixture = TestBed.createComponent(UnsavedChangesComponent)
    fixture.componentRef.setInput('cards', [
      { id: 200001, number: 13 },
      { id: 100001, number: 6 },
      { id: 100002, number: 74 },
    ])
    fixture.componentRef.setInput('baseline', [
      { id: 200001, number: 12 },
      { id: 100001, number: 4 },
      { id: 100002, number: 86 },
    ])
    fixture.detectChanges()
    return fixture
  }
  it('shows totals in section titles and translated changes with metadata fallback', () => {
    const fixture = setup()
    const el: HTMLElement = fixture.nativeElement
    expect(el.textContent).not.toContain('Changes since last save')
    expect(el.textContent).not.toContain('3 cards changed')
    const titles = Array.from(el.querySelectorAll('h6')).map((title) =>
      title.textContent?.replace(/\s+/g, ' ').trim(),
    )
    expect(titles[0]).toContain('Crypt 12 → 13')
    expect(titles[1]).toContain('Library 90 → 80')
    expect(el.textContent).toMatch(/Crypt 12 → 13/)
    expect(el.textContent).toMatch(/Library 90 → 80/)
    expect(fixture.componentInstance.expanded()).toBe(false)
    fixture.componentInstance.expanded.set(true)
    fixture.detectChanges()
    expect(el.textContent).toContain('Translated Deflection')
    expect(el.textContent).toContain('100002')
    expect(
      fixture.componentInstance.changes().map((c) => c.difference),
    ).toEqual([-12, 2, 1])
    fixture.componentRef.setInput('cards', [{ id: 100001, number: 7 }])
    fixture.detectChanges()
    expect(fixture.componentInstance.expanded()).toBe(true)
    fixture.componentRef.setInput('baseline', [{ id: 100001, number: 7 }])
    fixture.detectChanges()
    expect(fixture.componentInstance.expanded()).toBe(false)
    expect(el.textContent).toContain('No card quantity changes')
    expect(el.textContent).toContain('Deck details')
  })
  it('distinguishes no baseline from considering-only or metadata-only changes', () => {
    const fixture = setup()
    fixture.componentRef.setInput('baseline', undefined)
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('No saved version yet')
    expect(fixture.nativeElement.querySelector('button')).toBeNull()
    fixture.componentRef.setInput('baseline', [])
    fixture.componentRef.setInput('cards', [{ id: 100001, number: 0 }])
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain(
      'No card quantity changes',
    )
  })
})
