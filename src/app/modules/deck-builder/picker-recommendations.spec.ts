import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import {
  ApiArchetypeKeyCard,
  ApiCrypt,
  ApiLibrary,
  CryptFilter,
  LibraryFilter,
} from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { IndexedDbService, MediaService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptStore } from '@state/crypt/crypt.store'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryStore } from '@state/library/library.store'
import { SetQuery } from '@state/set/set.query'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { BehaviorSubject, firstValueFrom, of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CryptBuilderComponent } from './crypt-builder/crypt-builder.component'
import { LibraryBuilderComponent } from './library-builder/library-builder.component'

describe.each(['crypt', 'library'] as const)(
  '%s picker recommendations',
  (kind) => {
    afterEach(() => {
      TestBed.resetTestingModule()
      vi.useRealTimers()
    })

    async function setup() {
      const rec = (id: number, min = 1) =>
        ({ id, min, max: min + 2 }) as ApiArchetypeKeyCard
      const suggestions = new BehaviorSubject({
        keyCrypt: [rec(60)],
        keyLibrary: [rec(60)],
      })
      let filter: CryptFilter & LibraryFilter = {}
      let total = 1
      const updateFilter = (
        update: (
          current: CryptFilter & LibraryFilter,
        ) => CryptFilter & LibraryFilter,
      ) => {
        filter = update(filter)
      }
      const builder = {
        updateCryptFilter: updateFilter,
        updateLibraryFilter: updateFilter,
        resetCryptFilter: () => {
          filter = {}
        },
        resetLibraryFilter: () => {
          filter = {}
        },
        addCard: () => {
          total++
        },
        removeCard: () => {
          total--
        },
      }
      const query = {
        getCryptFilter: () => filter,
        getLibraryFilter: () => filter,
        selectCryptFilter: () => of(filter),
        selectLibraryFilter: () => of(filter),
        selectCryptSize: () => of(total),
        selectLibrarySize: () => of(total),
        getCryptSize: () => total,
        getLibrarySize: () => total,
        getCardNumber: () => total,
        getCardCollection: () => undefined,
        getLimitedFormat: () => undefined,
        getMinGroupCrypt: () => 1,
        getMaxGroupCrypt: () => 2,
        getCryptClans: () => [],
        getCryptDisciplines: () => [],
        getLibraryDisciplines: () => [],
        getCryptSects: () => [],
        selectSuggestedCards: () => suggestions,
        getValue: () => ({ suggestedCards: suggestions.value }),
      }
      TestBed.configureTestingModule({
        providers: [
          { provide: DeckBuilderQuery, useValue: query },
          { provide: DeckBuilderService, useValue: builder },
          {
            provide: IndexedDbService,
            useValue: { getAll: async () => [], putAll: vi.fn() },
          },
          {
            provide: MediaService,
            useValue: {
              observeMobile: () => of(false),
              observeMobileOrTablet: () => of(false),
            },
          },
          {
            provide: AuthQuery,
            useValue: { selectBuilderDisplayMode: () => of('grid') },
          },
          {
            provide: AuthService,
            useValue: { updateBuilderDisplayMode: vi.fn() },
          },
          { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
          ...[SetQuery, NgbModal, NgbActiveModal].map((provide) => ({
            provide,
            useValue: {},
          })),
        ],
      })
      const catalog = Array.from({ length: 60 }, (_, index) => ({
        id: index + 1,
        name: `Card ${String(index + 1).padStart(2, '0')}`,
        group: 1,
        capacity: index + 1,
        deckPopularity: index + 1,
        clans: [],
        disciplines: [],
        superiorDisciplines: [],
        sects: [],
        sets: [],
      }))
      const cryptStore = TestBed.inject(CryptStore)
      const libraryStore = TestBed.inject(LibraryStore)
      await Promise.all([cryptStore.ready, libraryStore.ready])
      cryptStore.set(catalog as unknown as ApiCrypt[])
      libraryStore.set(catalog as unknown as ApiLibrary[])
      const cryptSelect = vi.spyOn(TestBed.inject(CryptQuery), 'selectAll')
      const librarySelect = vi.spyOn(TestBed.inject(LibraryQuery), 'selectAll')
      const create = () =>
        TestBed.runInInjectionContext(() => {
          const component =
            kind === 'crypt'
              ? new CryptBuilderComponent()
              : new LibraryBuilderComponent()
          component.ngOnInit()
          return component
        })
      const component = create()
      const results = async (picker = component) => {
        TestBed.tick()
        const cards =
          picker instanceof CryptBuilderComponent
            ? await firstValueFrom(picker.crypt$)
            : await firstValueFrom(picker.library$)
        return cards.map((card) => card.id)
      }
      const latestTotal = () =>
        kind === 'crypt'
          ? cryptSelect.mock.lastCall?.[0].crypt?.total
          : librarySelect.mock.lastCall?.[0].stats?.total
      const changeRecommendations = () =>
        suggestions.next({ keyCrypt: [rec(59, 4)], keyLibrary: [rec(59, 4)] })
      return { component, create, results, latestTotal, changeRecommendations }
    }

    it('updates recommendation quantities without moving results, including when scrolling', async () => {
      const { component, results, latestTotal, changeRecommendations } =
        await setup()
      const initial = await results()
      expect(initial[0]).toBe(60)
      expect(initial).toHaveLength(50)
      component.addCard(60)
      changeRecommendations()
      expect(component.recommendations().get(59)?.min).toBe(4)
      expect(component.recommendations().has(60)).toBe(false)
      expect(await results()).toEqual(initial)
      component.onChangeDisplayMode('list')
      component.onScroll()
      const expanded = await results()
      expect(expanded).toHaveLength(60)
      expect(expanded.slice(0, 50)).toEqual(initial)
      expect(latestTotal()).toBe(1)
      component.removeCard(60)
      expect(await results()).toEqual(expanded)
    })

    it('adopts current ranking on filters, reset and reopen, but not on a late response', async () => {
      const { component, create, results, latestTotal, changeRecommendations } =
        await setup()
      component.addCard(60)
      changeRecommendations()
      if (component instanceof CryptBuilderComponent) {
        component.onChangeCryptFilter({})
      } else {
        component.onChangeLibraryFilter({})
      }
      expect((await results())[0]).toBe(59)
      expect(latestTotal()).toBe(2)
      component.resetFilters()
      expect((await results())[0]).toBe(59)
      expect((await results(create()))[0]).toBe(59)
    })

    it('preserves explicit sorts and adopts the latest priority when returning to relevance', async () => {
      const { component, results, changeRecommendations } = await setup()
      const event = new MouseEvent('click')
      component.onChangeSortBy('name', event)
      changeRecommendations()
      expect((await results())[0]).toBe(1)
      component.onChangeSortBy('name', event)
      expect((await results())[0]).toBe(60)
      if (component instanceof CryptBuilderComponent) {
        component.onChangeSortBy('capacity', event)
        expect((await results())[0]).toBe(1)
      }
      component.onChangeSortBy('relevance', event)
      expect((await results())[0]).toBe(59)
    })

    it('adopts updates on a debounced search while keeping name-match ordering', async () => {
      const { component, results, changeRecommendations } = await setup()
      vi.useFakeTimers()
      changeRecommendations()
      component.nameFormControl.setValue('Card 01')
      vi.advanceTimersByTime(500)
      expect((await results())[0]).toBe(1)
      component.nameFormControl.setValue('')
      vi.advanceTimersByTime(500)
      expect((await results())[0]).toBe(59)
    })
  },
)
