import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { CryptFilter } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { MediaService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { of } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CardAdvancedFiltersComponent } from './card-advanced-filters.component'

describe('CardAdvancedFiltersComponent', () => {
  const defaultCryptFilter = (): CryptFilter => ({
    name: '',
    clans: [],
    notClans: [],
    disciplines: [],
    superiorDisciplines: [],
    notDisciplines: [],
    disciplineMode: 'and',
    groupSlider: [1, 7],
    capacitySlider: [1, 11],
    votesSlider: [0, 4],
    title: '',
    sect: '',
    paths: [],
    notPaths: [],
    sets: [],
    notSets: [],
    taints: [],
    cardText: '',
    artist: '',
  })

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(cardType: 'crypt' | 'library') {
    const getAll = vi.fn(() => [{ id: 200001 }, { id: 200002 }])
    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { en: {} } })],
      providers: [
        { provide: NgbModal, useValue: { open: vi.fn() } },
        {
          provide: MediaService,
          useValue: { observeMobileOrTablet: () => of(true) },
        },
        {
          provide: CryptQuery,
          useValue: { getDefaultCryptFilter: defaultCryptFilter, getAll },
        },
        {
          provide: LibraryQuery,
          useValue: {
            getDefaultLibraryFilter: () => ({ name: '', types: [] }),
            getAll,
          },
        },
      ],
    })
    // The template is never rendered (no detectChanges), so only the class
    // logic runs and no Transloco/NgBootstrap setup is needed.
    const fixture = TestBed.createComponent(CardAdvancedFiltersComponent)
    fixture.componentRef.setInput('cardType', cardType)
    const component = fixture.componentInstance
    component.ngOnInit()
    const emissions: (number[] | undefined)[] = []
    component.cardIdsChange.subscribe((ids) => emissions.push(ids))
    return { component, emissions, getAll }
  }

  it('emits matching card ids for a non-default filter', () => {
    const { component, emissions, getAll } = setup('crypt')
    component.cryptFilter!.clans = ['Toreador']
    component.onFilterChange()
    vi.advanceTimersByTime(300)

    expect(getAll).toHaveBeenCalledWith({ filter: component.cryptFilter })
    expect(emissions).toEqual([[200001, 200002]])
    expect(component.active()).toBe(true)
  })

  it('emits undefined when the filter returns to defaults', () => {
    const { component, emissions } = setup('crypt')
    component.cryptFilter!.clans = ['Toreador']
    component.onFilterChange()
    vi.advanceTimersByTime(300)
    component.cryptFilter!.clans = []
    component.onFilterChange()
    vi.advanceTimersByTime(300)

    expect(emissions).toEqual([[200001, 200002], undefined])
    expect(component.active()).toBe(false)
  })

  it('debounces rapid filter changes into one emission', () => {
    const { component, emissions } = setup('crypt')
    component.cryptFilter!.clans = ['Toreador']
    component.onFilterChange()
    vi.advanceTimersByTime(100)
    component.cryptFilter!.clans = ['Toreador', 'Brujah']
    component.onFilterChange()
    vi.advanceTimersByTime(300)

    expect(emissions).toHaveLength(1)
  })

  it('reset restores defaults and emits undefined only when active', () => {
    const { component, emissions } = setup('crypt')
    component.reset()
    expect(emissions).toEqual([])

    component.cryptFilter!.clans = ['Toreador']
    component.onFilterChange()
    vi.advanceTimersByTime(300)
    component.reset()

    expect(emissions).toEqual([[200001, 200002], undefined])
    expect(component.active()).toBe(false)
    expect(component.cryptFilter!.clans).toEqual([])
  })
})
