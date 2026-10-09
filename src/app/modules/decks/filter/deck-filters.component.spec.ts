import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiDataService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { DecksQuery } from '@state/decks/decks.query'
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router'
import { FormBuilder, FormControl, FormGroup } from '@angular/forms'
import { BehaviorSubject, of, Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckFiltersComponent } from './deck-filters.component'
import { positionRangeFromParams } from './deck-filter-defaults'

describe('Deck tag filters', () => {
  afterEach(() => TestBed.resetTestingModule())
  it('adds a fully typed custom tag while preserving existing tags, and rejects invalid text', () => {
    const context = Object.assign(
      Object.create(DeckFiltersComponent.prototype),
      {
        availableTags: ['stealth'],
        filterForm: new FormGroup({ tags: new FormControl('stealth') }),
        changeDetector: { markForCheck: vi.fn() },
        tagsTypeahead: () => ({ dismissPopup: vi.fn() }),
      },
    ) as DeckFiltersComponent
    const input = document.createElement('input')
    input.value = 'league'
    context.addTypedTag(input, new Event('keydown'))
    expect(context.tags).toEqual(['stealth', 'league'])
    expect(input.value).toBe('')
    input.value = 'UPPER'
    context.addTypedTag(input, new Event('keydown'))
    expect(context.tagInputError).toBe(true)
    expect(context.tags).toEqual(['stealth', 'league'])
    input.value = 'league'
    context.addTypedTag(input, new Event('keydown'))
    expect(context.tags).toEqual(['stealth', 'league'])
    context.onDeselectTag('league')
    expect(context.tags).toEqual(['stealth'])
  })

  it('selects a typed custom suggestion and clears the input', () => {
    const context = Object.assign(
      Object.create(DeckFiltersComponent.prototype),
      { onSelectTag: vi.fn(), tagInputError: true },
    ) as DeckFiltersComponent
    const input = document.createElement('input')
    input.value = 'league'
    const preventDefault = vi.fn()
    context.onSelectTagItem({ item: 'league', preventDefault }, input)
    expect(context.onSelectTag).toHaveBeenCalledWith('league')
    expect(preventDefault).toHaveBeenCalled()
    expect(input.value).toBe('')
    expect(context.tagInputError).toBe(false)
  })

  it('leaves keyboard-highlighted suggestions to typeahead instead of adding the partial text', () => {
    const context = Object.assign(
      Object.create(DeckFiltersComponent.prototype),
      { onSelectTag: vi.fn() },
    ) as DeckFiltersComponent
    const input = document.createElement('input')
    input.value = 'ste'
    input.setAttribute('aria-activedescendant', 'tag-option-0')
    context.addTypedTag(input, new Event('keydown'))
    expect(context.onSelectTag).not.toHaveBeenCalled()
  })

  it('switches suggestions with section and account, canceling stale private results', () => {
    const params = new BehaviorSubject(convertToParamMap({ type: 'USER' }))
    const user = new BehaviorSubject<string | undefined>('alice')
    const alice = new Subject<string[]>()
    const bob = new Subject<string[]>()
    const api = {
      getDeckTags: vi.fn(() => of(['stealth'])),
      getUserDeckTags: vi
        .fn()
        .mockReturnValueOnce(alice)
        .mockReturnValueOnce(bob),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: Router, useValue: {} },
        { provide: DecksQuery, useValue: { selectCurrency: () => of('EUR') } },
        FormBuilder,
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: ApiDataService, useValue: api },
        { provide: TranslocoService, useValue: {} },
        { provide: AuthQuery, useValue: { selectUser: () => user } },
      ],
    })
    const context = TestBed.runInInjectionContext(
      () => new DeckFiltersComponent(),
    )
    Object.assign(context, {
      tagsTypeahead: () => ({ isPopupOpen: () => false }),
      initFilterForm: vi.fn(),
      getCurrentDisciplines: () => [],
      getCurrentClans: () => [],
      getCurrentList: () => [],
      getCurrentMode: () => 'and',
      getCurrentPaths: () => [],
      getCurrentRounds: () => [],
    })
    context.ngOnInit()
    const suggestions: string[][] = []
    const subscription = context
      .searchTag(new Subject<string>())
      .subscribe((tags) => suggestions.push(tags))
    context.tagFocus$.next('')
    alice.next(['stealth', 'aliceonly'])
    expect(context.availableTags).toEqual(['stealth', 'aliceonly'])
    user.next('bob')
    expect(context.availableTags).toEqual([])
    expect(suggestions.at(-1)).toEqual([])
    alice.next(['private'])
    expect(context.availableTags).toEqual([])
    bob.next(['stealth', 'bobonly'])
    expect(context.availableTags).toEqual(['stealth', 'bobonly'])
    params.next(convertToParamMap({ type: 'ALL' }))
    expect(context.availableTags).toEqual(['stealth'])
    context.tagFocus$.next('league')
    expect(suggestions.at(-1)).toEqual(['league'])
    context.tagFocus$.next('ste')
    expect(suggestions.at(-1)).toEqual(['ste', 'stealth'])
    context.tagFocus$.next('stealth')
    expect(suggestions.at(-1)).toEqual(['stealth'])
    for (const invalid of ['UPPER', 'two words', 'tag!', 'abcdefghijk']) {
      context.tagFocus$.next(invalid)
      expect(suggestions.at(-1)).toEqual([])
    }
    context.tagFocus$.next('')
    expect(suggestions.at(-1)).toEqual(['stealth'])
    user.next(undefined)
    expect(context.availableTags).toEqual(['stealth'])
    subscription.unsubscribe()
    params.complete()
    user.complete()
    alice.complete()
    bob.complete()
  })
})

describe('Deck position filters', () => {
  afterEach(() => TestBed.resetTestingModule())

  it('fills a missing position bound with the visible slider limit', () => {
    expect(positionRangeFromParams('2', undefined)).toEqual([2, 5])
    expect(positionRangeFromParams(undefined, '4')).toEqual([1, 4])
  })

  it('writes both bounds for shortcuts and clears both for any position', () => {
    const navigate = vi.fn()
    const context = Object.assign(
      Object.create(DeckFiltersComponent.prototype),
      {
        filterForm: new FormGroup({ position: new FormControl([1, 5]) }),
        positionMin: 1,
        positionMax: 5,
        router: { navigate },
        route: {},
      },
    ) as DeckFiltersComponent

    context.setPositionShortcut([1, 1])
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { minPosition: 1, maxPosition: 1 },
      }),
    )
    context.setPositionShortcut([2, 5])
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { minPosition: 2, maxPosition: 5 },
      }),
    )
    context.setPositionShortcut(null)
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { minPosition: undefined, maxPosition: undefined },
      }),
    )
  })
})
