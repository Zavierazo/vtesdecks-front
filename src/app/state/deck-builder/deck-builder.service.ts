import { ADVENT_DATA, AdventData } from '@advent/advent.data'
import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import {
  ApiCard,
  ApiCollectionPage,
  ApiDeck,
  ApiDeckBuilder,
  ApiDeckLimitedFormat,
  CryptFilter,
  DeckCryptSortBy,
  DeckLibrarySortBy,
  FILTER_GROUP_BY,
  LibraryFilter,
} from '@models'
import { ApiDataService } from '@services'
import { getSetAbbrev } from '@utils'
import {
  catchError,
  combineLatest,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { CollectionQueryState } from '../../modules/collection/state/collection.store'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderStore } from './deck-builder.store'
@Injectable({ providedIn: 'root' })
export class DeckBuilderService {
  private readonly store = inject(DeckBuilderStore)
  private readonly query = inject(DeckBuilderQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly collectionApiDataService = inject(CollectionApiDataService)
  private readonly translocoService = inject(TranslocoService)

  init(id: string, cloneDeck: ApiDeck): Observable<ApiDeckBuilder> {
    this.store.reset()
    if (id) {
      return this.apiDataService.getDeckBuilder(id).pipe(
        tap((deck) => {
          this.store.update((state) => ({
            ...state,
            id: deck.id,
            name: deck.name,
            description: deck.description,
            cards: deck.cards ?? [],
            published: deck.published ?? false,
            collection: deck.collection ?? false,
            extra: deck.extra,
            saved: true,
          }))
          if (deck.extra?.advent) {
            this.initAdventRules(
              deck.extra.advent.year.toString(),
              deck.extra.advent.day.toString(),
            )
          }
          this.validateDeck()
        }),
        switchMap((deck) =>
          combineLatest([
            of(deck),
            deck.collection ? this.fetchCollection() : of({}),
          ]),
        ),
        map(([deck]) => deck),
      )
    } else if (cloneDeck) {
      this.store.update((state) => ({
        ...state,
        name: '[COPY] ' + cloneDeck.name,
        description: cloneDeck.description,
        extra: {
          ...cloneDeck.extra,
          advent: undefined,
        },
        cards: [...cloneDeck.crypt!, ...cloneDeck.library!],
        published: false,
        collection: false,
        saved: false,
      }))
      this.validateDeck()
    }

    return of({})
  }

  initAdventRules(advent: string, day: string): void {
    const adventItem = ADVENT_DATA.find(
      (item: AdventData) => item.year.toString() === advent,
    )
    const adventDayItem = adventItem
      ? Object.entries(adventItem.days).find(([key]) => key === day)?.[1]
      : undefined
    if (adventItem && adventDayItem) {
      const adventContent = adventDayItem.content.replace(/<\/?strong>/g, '**')
      const adventDescription = `**Advent ${adventItem.year} - Day ${day}**\n\n**Name**: ${adventDayItem.title}\n\n${adventContent}`
      this.store.update((state) => ({
        ...state,
        name: state.name ? state.name : `Advent${adventItem.year}: `,
        description: state.description ? state.description : adventDescription,
        extra: {
          advent: {
            year: adventItem.year,
            day: parseInt(day),
            title: adventDayItem.title,
            content: adventDayItem.content,
          },
        },
        validation: adventItem.validation,
        customValidation: adventDayItem.validation,
      }))
    }
  }

  clone(): void {
    const { name, description, extra, cards } = this.store.getValue()
    this.store.reset()
    this.store.update((state) => ({
      ...state,
      name: '[COPY] ' + name,
      description: description,
      extra,
      cards: [...cards],
      published: false,
      collection: false,
      saved: false,
    }))
    this.validateDeck()
  }

  cloneFrom(deck: ApiDeckBuilder): void {
    this.store.reset()
    this.store.update((state) => ({
      ...state,
      name: '[COPY] ' + (deck.name ?? ''),
      description: deck.description,
      extra: deck.extra,
      cards: [...(deck.cards ?? [])],
      published: false,
      collection: false,
      saved: false,
    }))
    this.validateDeck()
  }

  importDeck(type: string, url: string): Observable<ApiDeckBuilder> {
    return this.apiDataService.getDeckBuilderImport(type, url).pipe(
      tap((deck) => {
        this.store.update((state) => ({
          ...state,
          name: state.name ? state.name : deck.name,
          description: state.description ? state.description : deck.description,
          cards: deck.cards ?? [],
          collection: false,
          saved: false,
        }))
        this.validateDeck()
      }),
    )
  }

  importDeckFromText(text: string): Observable<ApiDeckBuilder> {
    return this.apiDataService.importDeckFromText(text).pipe(
      tap((deck) => {
        this.store.update((state) => ({
          ...state,
          name: state.name ? state.name : deck.name,
          description: state.description ? state.description : deck.description,
          cards: deck.cards ?? [],
          collection: false,
          saved: false,
        }))
        this.validateDeck()
      }),
    )
  }

  applyImportedDeck(deck: ApiDeckBuilder): Observable<ApiDeckBuilder> {
    return of(deck).pipe(
      tap((d) => {
        this.store.update((state) => ({
          ...state,
          name: state.name ? state.name : d.name,
          description: state.description ? state.description : d.description,
          cards: d.cards ?? [],
          collection: false,
          saved: false,
        }))
        this.validateDeck()
      }),
    )
  }

  saveDeck(tagLabel?: string): Observable<ApiDeckBuilder> {
    if (this.store.getLoading()) {
      return throwError(() => new Error('Another action in progress'))
    }
    const deck = this.query.getValue()
    this.store.setLoading(true)
    return this.apiDataService
      .saveDeckBuilder({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        cards: deck.cards,
        published: deck.published,
        collection: deck.collection,
        extra: deck.extra,
        tagLabel: tagLabel || undefined,
      } as ApiDeckBuilder)
      .pipe(
        tap((saved) => {
          this.store.update((state) => ({
            ...state,
            id: saved.id,
            name: saved.name,
            description: saved.description,
            cards: saved.cards ?? [],
            extra: saved.extra,
            published: saved.published ?? false,
            collection: saved.collection ?? false,
            saved: true,
          }))
          this.clearDraft(deck.id)
          this.validateDeck()
        }),
        finalize(() => this.store.setLoading(false)),
      )
  }

  deleteDeck(deckId: string, permanent: boolean): Observable<boolean> {
    return this.apiDataService.deleteDeckBuilder(deckId, permanent).pipe(
      tap((result) => {
        if (result) {
          this.store.reset()
        }
      }),
    )
  }

  updateName(name: string) {
    this.store.updateName(name)
    this.store.setSaved(false)
    this.saveDraft()
  }

  updateDescription(description: string) {
    this.store.updateDescription(description)
    this.store.setSaved(false)
    this.saveDraft()
  }

  updatePublished(published: boolean) {
    this.store.updatePublished(published)
    this.store.setSaved(false)
  }

  updateCollection(collection: boolean): Observable<ApiCollectionPage> {
    this.store.updateCollection(collection)
    this.store.setSaved(false)
    if (collection && !this.query.hasCollectionCards()) {
      return this.fetchCollection()
    } else {
      this.store.updateCollectionCards()
      return EMPTY
    }
  }

  addCard(id: number) {
    const type = this.libraryQuery.getEntity(id)?.type
    this.store.addCard(id, type)
    this.validateDeck()
    this.store.setSaved(false)
    this.saveDraft()
  }

  removeCard(id: number) {
    this.store.removeCard(id)
    this.validateDeck()
    this.store.setSaved(false)
    this.saveDraft()
  }

  setLimitedFormat(format?: ApiDeckLimitedFormat) {
    this.store.setLimitedFormat(format)
    this.validateDeck()
    this.store.setSaved(false)
  }

  resetCryptFilter() {
    this.store.resetCryptFilter()
  }

  updateCryptFilter(updateFn: (value: CryptFilter) => CryptFilter) {
    this.store.update((state) => ({
      ...state,
      cryptFilter: updateFn(state.cryptFilter),
    }))
  }

  resetLibraryFilter() {
    this.store.resetLibraryFilter()
  }

  updateLibraryFilter(updateFn: (value: LibraryFilter) => LibraryFilter) {
    this.store.update((state) => ({
      ...state,
      libraryFilter: updateFn(state.libraryFilter),
    }))
  }

  setCryptSortBy(sortBy: DeckCryptSortBy) {
    this.store.setCryptSortBy(sortBy)
  }

  setLibrarySortBy(sortBy: DeckLibrarySortBy) {
    this.store.setLibrarySortBy(sortBy)
  }

  validateDeck(): boolean {
    let isValid = true
    const limitedFormat = this.query.getLimitedFormat()
    const cryptErrors = []

    const cryptSize = this.query.getCryptSize()
    const minCrypt = limitedFormat?.minCrypt ?? 12
    const maxCrypt = limitedFormat?.maxCrypt
    if (cryptSize < minCrypt) {
      cryptErrors.push(
        this.translocoService.translate(
          'deck_builder_service.min_crypt_cards',
          { minCrypt },
        ),
      )
      isValid = false
    }
    if (maxCrypt && cryptSize > maxCrypt) {
      cryptErrors.push(
        this.translocoService.translate(
          'deck_builder_service.max_crypt_cards',
          { maxCrypt },
        ),
      )
      isValid = false
    }

    const groups = new Set<number>()
    for (const crypt of this.query.getCrypt()) {
      if (crypt.banned) {
        cryptErrors.push(
          this.translocoService.translate('deck_builder_service.banned_card', {
            name: crypt.name,
          }),
        )
        isValid = false
      } else if (
        limitedFormat &&
        !limitedFormat.allowed.crypt[crypt.id] &&
        (limitedFormat.banned.crypt[crypt.id] ||
          !Object.keys(limitedFormat.sets).some((set) =>
            crypt.sets.some((cryptSet) => getSetAbbrev(cryptSet) === set),
          ))
      ) {
        cryptErrors.push(
          this.translocoService.translate(
            'deck_builder_service.limited_format_not_allowed',
            {
              name: crypt.name,
            },
          ),
        )
        isValid = false
      }
      if (crypt.group > 0) {
        groups.add(crypt.group)
      }
    }
    if (groups.size > 2) {
      cryptErrors.push(
        this.translocoService.translate(
          'deck_builder_service.invalid_crypt_group',
        ),
      )
      isValid = false
    } else if (groups.size > 1) {
      const sortedGroups = Array.from(groups).sort((a, b) => a - b)
      if (sortedGroups[1] - sortedGroups[0] > 1) {
        cryptErrors.push(
          this.translocoService.translate(
            'deck_builder_service.consecutive_crypt_group',
          ),
        )
        isValid = false
      }
    }

    const libraryErrors = []
    const librarySize = this.query.getLibrarySize()
    const minLibrary = limitedFormat?.minLibrary ?? 60
    const maxLibrary = limitedFormat?.maxLibrary ?? 90
    if (librarySize < minLibrary) {
      libraryErrors.push(
        this.translocoService.translate(
          'deck_builder_service.min_library_cards',
          { minLibrary },
        ),
      )
      isValid = false
    }
    if (librarySize > maxLibrary) {
      libraryErrors.push(
        this.translocoService.translate(
          'deck_builder_service.max_library_cards',
          { maxLibrary },
        ),
      )
      isValid = false
    }
    for (const library of this.query.getLibrary()) {
      if (library.banned) {
        libraryErrors.push(
          this.translocoService.translate('deck_builder_service.banned_card', {
            name: library.name,
          }),
        )
        isValid = false
      } else if (
        limitedFormat &&
        !limitedFormat.allowed.library[library.id] &&
        (limitedFormat.banned.library[library.id] ||
          !Object.keys(limitedFormat.sets).some((set) =>
            library.sets.some((librarySet) => getSetAbbrev(librarySet) === set),
          ))
      ) {
        libraryErrors.push(
          this.translocoService.translate(
            'deck_builder_service.limited_format_not_allowed',
            {
              name: library.name,
            },
          ),
        )
        isValid = false
      }
    }

    const customValidation = this.query.getValue().customValidation
    if (customValidation) {
      const {
        cryptErrors: customCryptErrors,
        libraryErrors: customLibraryErrors,
      } = customValidation(this.query)
      if (customCryptErrors && customCryptErrors.length > 0) {
        cryptErrors.push(...customCryptErrors)
        isValid = false
      }
      if (customLibraryErrors && customLibraryErrors.length > 0) {
        libraryErrors.push(...customLibraryErrors)
        isValid = false
      }
    }

    this.store.setCryptErrors(cryptErrors)
    this.store.setLibraryErrors(libraryErrors)

    return isValid
  }

  private static readonly DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

  cleanupExpiredDrafts(): void {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key?.startsWith('deckBuilderDraft_')) continue
        const data = localStorage.getItem(key)
        if (!data) continue
        const parsed = JSON.parse(data) as { savedAt?: number }
        if (
          !parsed.savedAt ||
          Date.now() - parsed.savedAt > DeckBuilderService.DRAFT_MAX_AGE_MS
        ) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch {
      // ignore
    }
  }

  saveDraft(): void {
    const { id, name, description, published, collection, cards, extra } =
      this.store.getValue()
    const key = `deckBuilderDraft_${id ?? 'new'}`
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          id,
          name,
          description,
          published,
          collection,
          cards,
          extra,
          savedAt: Date.now(),
        }),
      )
    } catch {
      // localStorage unavailable or full — silently skip
    }
  }

  loadDraft(id?: string): ApiDeckBuilder | null {
    const key = `deckBuilderDraft_${id ?? 'new'}`
    try {
      const data = localStorage.getItem(key)
      if (!data) return null
      const parsed = JSON.parse(data) as ApiDeckBuilder & { savedAt?: number }
      if (
        parsed.savedAt &&
        Date.now() - parsed.savedAt > DeckBuilderService.DRAFT_MAX_AGE_MS
      ) {
        localStorage.removeItem(key)
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  clearDraft(id?: string): void {
    const key = `deckBuilderDraft_${id ?? 'new'}`
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  restoreFromDraft(draft: ApiDeckBuilder): void {
    this.store.update((state) => ({
      ...state,
      name: draft.name ?? state.name,
      description: draft.description ?? state.description,
      cards: draft.cards ?? state.cards,
      extra: draft.extra ?? state.extra,
      saved: false,
    }))
    this.validateDeck()
  }

  restoreFromHistory(cards: ApiCard[]): void {
    this.store.update((state) => ({ ...state, cards, saved: false }))
    this.validateDeck()
  }

  fetchSuggestedCards(): void {
    if (this.query.isBelowThreshold()) {
      this.store.setSuggestedCards(null)
      return
    }
    this.apiDataService
      .getSuggestedCards(this.store.getValue().cards)
      .pipe(catchError(() => of(null)))
      .subscribe((result) => this.store.setSuggestedCards(result))
  }

  private fetchCollection(): Observable<ApiCollectionPage> {
    const query = {
      page: 0,
      pageSize: 10000,
      sortBy: 'cardId',
      sortDirection: 'asc',
      filters: [[FILTER_GROUP_BY, 'cardId']],
    } as CollectionQueryState
    return this.collectionApiDataService.getCards(query).pipe(
      tap((response) => {
        this.store.updateCollectionCards(response.content)
      }),
    )
  }
}
