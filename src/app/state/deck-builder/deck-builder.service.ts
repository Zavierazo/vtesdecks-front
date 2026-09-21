import { ADVENT_DATA, AdventData } from '@advent/advent.data'
import { inject, Injectable, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
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
  debounceTime,
  EMPTY,
  finalize,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
  throwError,
} from 'rxjs'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { CollectionQueryState } from '../../modules/collection/state/collection.store'
import { LocalDeckDraftsService } from '../../services/local-deck-drafts.service'
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
  readonly localDrafts = inject(LocalDeckDraftsService)
  readonly activeLocalDraftId = signal<string | undefined>(undefined)
  readonly draftStorageError = signal(false)
  readonly draftSaved = new Subject<void>()
  private readonly suggestionRefresh = new Subject<void>()

  constructor() {
    this.suggestionRefresh
      .pipe(
        debounceTime(3000),
        switchMap(() => {
          if (this.query.isBelowThreshold()) {
            return of(null)
          }
          return this.apiDataService
            .getSuggestedCards(this.store.getValue().cards)
            .pipe(catchError(() => of(null)))
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.store.setSuggestedCards(result))
  }

  init(
    id: string | undefined,
    cloneDeck: ApiDeck,
    localDraftId?: string,
  ): Observable<ApiDeckBuilder> {
    this.fetchSuggestedCards()
    this.store.reset()
    this.activeLocalDraftId.set(undefined)
    if (localDraftId) {
      if (!this.openLocalDraft(localDraftId)) {
        return throwError(() => new Error('Local draft not found'))
      }
      return of(this.store.getValue())
    }
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
    this.fetchSuggestedCards()
    this.store.reset()
    this.activeLocalDraftId.set(undefined)
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
    this.fetchSuggestedCards()
    this.store.reset()
    this.activeLocalDraftId.set(undefined)
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
        this.saveDraft()
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
          if (this.activeLocalDraftId()) {
            this.draftStorageError.set(
              !this.localDrafts.remove(this.activeLocalDraftId()!),
            )
          }
          if (!this.activeLocalDraftId()) {
            this.clearDraft(deck.id)
          }
          this.activeLocalDraftId.set(undefined)
          this.validateDeck()
        }),
        finalize(() => this.store.setLoading(false)),
      )
  }

  deleteDeck(deckId: string, permanent: boolean): Observable<boolean> {
    return this.apiDataService.deleteDeckBuilder(deckId, permanent).pipe(
      tap((result) => {
        if (result) {
          this.fetchSuggestedCards()
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
    this.saveDraft()
  }

  updateCollection(collection: boolean): Observable<ApiCollectionPage> {
    this.store.updateCollection(collection)
    this.store.setSaved(false)
    this.saveDraft()
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

  setCardQuantity(id: number, quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      return
    }
    const existing = this.store.getValue().cards.find((card) => card.id === id)
    if ((existing?.number ?? 0) === quantity) {
      return
    }
    const type = this.libraryQuery.getEntity(id)?.type
    this.store.update((state) => ({
      ...state,
      cards: existing
        ? state.cards.map((card) =>
            card.id === id ? { ...card, number: quantity } : card,
          )
        : [...state.cards, { id, type, number: quantity }],
    }))
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
    this.saveDraft()
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
    const cryptCards = this.query.getCrypt()
    const libraryCards = this.query.getLibrary()
    const missingCrypt = cryptCards.some((card) => !card)
    const missingLibrary = libraryCards.some((card) => !card)
    if (missingCrypt || missingLibrary) {
      const message = this.translocoService.translate(
        'deck_builder_service.missing_cards',
      )
      this.store.setCryptErrors(missingCrypt ? [message] : [])
      this.store.setLibraryErrors(missingLibrary ? [message] : [])
      return false
    }
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
    for (const crypt of cryptCards) {
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
    for (const library of libraryCards) {
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
    const deck = this.store.getValue()
    const localId = this.activeLocalDraftId()
    const saved = this.localDrafts.save(
      deck.name?.trim() ||
        this.translocoService.translate('local_drafts.untitled'),
      deck,
      localId,
    )
    this.draftStorageError.set(!saved)
    if (saved) {
      this.activeLocalDraftId.set(saved.id)
      this.draftSaved.next()
    }
  }

  discardCurrentDraft(): boolean {
    const id = this.activeLocalDraftId()
    if (id && !this.localDrafts.remove(id)) {
      this.draftStorageError.set(true)
      return false
    }
    this.activeLocalDraftId.set(undefined)
    this.draftStorageError.set(false)
    return true
  }

  migrateLegacyDrafts(): void {
    try {
      const keys = Array.from({ length: localStorage.length }, (_, index) =>
        localStorage.key(index),
      )
      for (const key of keys) {
        if (!key?.startsWith('deckBuilderDraft_')) {
          continue
        }
        const suffix = key.slice('deckBuilderDraft_'.length)
        const draft = this.loadDraft(suffix === 'new' ? undefined : suffix)
        if (!draft || !Array.isArray(draft.cards)) {
          continue
        }
        const saved = this.localDrafts.save(
          draft.name?.trim() ||
            this.translocoService.translate('local_drafts.untitled'),
          { ...draft, id: suffix === 'new' ? undefined : suffix },
        )
        if (!saved) {
          this.draftStorageError.set(true)
          return
        }
        localStorage.removeItem(key)
      }
    } catch {
      this.draftStorageError.set(true)
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
      published: draft.published ?? state.published,
      collection: draft.collection ?? state.collection,
      cards: draft.cards ?? state.cards,
      extra: draft.extra,
      saved: false,
    }))
    this.validateDeck()
    this.saveDraft()
    this.restoreCollection()
    if (!this.draftStorageError()) {
      this.clearDraft(this.store.getValue().id)
    }
  }

  hasDraftChanges(draft: ApiDeckBuilder): boolean {
    const current = this.store.getValue()
    const fingerprint = (deck: ApiDeckBuilder) =>
      JSON.stringify({
        name: deck.name ?? '',
        description: deck.description ?? '',
        published: deck.published ?? false,
        collection: deck.collection ?? false,
        extra: deck.extra ?? null,
        cards: (deck.cards ?? [])
          .map((card) => `${card.id}:${card.number}`)
          .sort(),
      })
    return fingerprint(draft) !== fingerprint(current)
  }

  restoreFromHistory(cards: ApiCard[]): void {
    this.store.update((state) => ({ ...state, cards, saved: false }))
    this.validateDeck()
    this.saveDraft()
  }

  openLocalDraft(id: string): boolean {
    if (!this.localDrafts.reload()) {
      return false
    }
    const draft = this.localDrafts.get(id)
    if (!draft || draft.sourceDeckId) {
      return false
    }
    this.fetchSuggestedCards()
    this.store.reset()
    this.activeLocalDraftId.set(id)
    this.store.update((state) => ({
      ...state,
      name: draft.deck.name,
      description: draft.deck.description,
      cards: (draft.deck.cards ?? []).map((card) => ({ ...card })),
      extra: draft.deck.extra,
      saved: false,
      published: draft.deck.published ?? false,
      collection: draft.deck.collection ?? false,
    }))
    this.draftStorageError.set(false)
    this.validateDeck()
    this.restoreCollection()
    return true
  }

  private restoreCollection(): void {
    if (this.store.getValue().collection && navigator.onLine) {
      this.fetchCollection()
        .pipe(catchError(() => EMPTY))
        .subscribe()
    } else {
      this.store.updateCollectionCards()
    }
  }

  fetchSuggestedCards(): void {
    this.suggestionRefresh.next()
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
