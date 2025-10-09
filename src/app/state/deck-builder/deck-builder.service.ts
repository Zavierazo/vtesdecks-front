import { inject, Injectable } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import {
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
import { ApiDeck } from 'src/app/models/api-deck'
import { FILTER_GROUP_BY } from '../../models/api-collection-card'
import { ApiCollectionPage } from '../../models/api-collection-page'
import { ApiDeckBuilder } from '../../models/api-deck-builder'
import { ApiDeckLimitedFormat } from '../../models/api-deck-limited-format'
import { CollectionQueryState } from '../../modules/collection/state/collection.store'
import { LibraryQuery } from '../library/library.query'
import { CollectionApiDataService } from './../../modules/collection/services/collection-api.data.service'
import { ApiDataService } from './../../services/api.data.service'
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
        extra: cloneDeck.extra,
        cards: [...cloneDeck.crypt!, ...cloneDeck.library!],
        published: false,
        collection: false,
        saved: false,
      }))
      this.validateDeck()
    }

    return of({})
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

  importDeck(type: string, url: string): Observable<ApiDeckBuilder> {
    return this.apiDataService.getDeckBuilderImport(type, url).pipe(
      tap((deck) => {
        this.store.reset()
        this.store.update((state) => ({
          ...state,
          id: undefined,
          name: deck.name,
          description: deck.description,
          cards: deck.cards ?? [],
          published: true,
          collection: false,
          saved: false,
        }))
        this.validateDeck()
      }),
    )
  }

  saveDeck(): Observable<ApiDeckBuilder> {
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
      } as ApiDeckBuilder)
      .pipe(
        tap((deck) => {
          this.store.update((state) => ({
            ...state,
            id: deck.id,
            name: deck.name,
            description: deck.description,
            cards: deck.cards ?? [],
            extra: deck.extra,
            published: deck.published ?? false,
            collection: deck.collection ?? false,
            saved: true,
          }))
          this.validateDeck()
        }),
        finalize(() => this.store.setLoading(false)),
      )
  }

  deleteDeck(deckId: string): Observable<boolean> {
    return this.apiDataService.deleteDeckBuilder(deckId).pipe(
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
  }

  updateDescription(description: string) {
    this.store.updateDescription(description)
    this.store.setSaved(false)
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
  }

  removeCard(id: number) {
    this.store.removeCard(id)
    this.validateDeck()
    this.store.setSaved(false)
  }

  setLimitedFormat(format?: ApiDeckLimitedFormat) {
    this.store.setLimitedFormat(format)
    this.validateDeck()
    this.store.setSaved(false)
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
            crypt.sets.some((cryptSet) => cryptSet.split(':')[0] === set),
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
    this.store.setCryptErrors(cryptErrors)

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
            library.sets.some((librarySet) => librarySet.split(':')[0] === set),
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
    this.store.setLibraryErrors(libraryErrors)

    return isValid
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
