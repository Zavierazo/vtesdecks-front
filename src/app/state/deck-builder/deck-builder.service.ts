import { inject, Injectable, SecurityContext } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { TranslocoService } from '@jsverse/transloco'
import { finalize, Observable, of, tap, throwError } from 'rxjs'
import { ApiDeck } from 'src/app/models/api-deck'
import { ApiDeckBuilder } from '../../models/api-deck-builder'
import { ApiDeckExtra } from '../../models/api-deck-extra'
import { ApiDeckLimitedFormat } from '../../models/api-deck-limited-format'
import { PREDEFINED_LIMITED_FORMATS } from '../../modules/deck-builder/limited-format/limited-format.const'
import { LibraryQuery } from '../library/library.query'
import { ApiDataService } from './../../services/api.data.service'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderStore } from './deck-builder.store'
@Injectable({ providedIn: 'root' })
export class DeckBuilderService {
  private readonly store = inject(DeckBuilderStore)
  private readonly query = inject(DeckBuilderQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly translocoService = inject(TranslocoService)
  private readonly sanitizer = inject(DomSanitizer)

  init(id: string, cloneDeck: ApiDeck): Observable<ApiDeckBuilder> {
    this.store.reset()
    if (id) {
      return this.apiDataService.getDeckBuilder(id).pipe(
        tap((deck) => {
          this.store.update((state) => ({
            ...state,
            id: deck.id,
            name: deck.name,
            description: this.sanitizeDescription(deck.description),
            cards: deck.cards ?? [],
            published: deck.published ?? false,
            extra: this.updatePredefinedFormat(deck.extra),
            saved: true,
          }))
          this.validateDeck()
        }),
      )
    } else if (cloneDeck) {
      this.store.update((state) => ({
        ...state,
        name: '[COPY] ' + cloneDeck.name,
        description: this.sanitizeDescription(cloneDeck.description),
        extra: cloneDeck.extra,
        cards: [...cloneDeck.crypt!, ...cloneDeck.library!],
        published: false,
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
      description: this.sanitizeDescription(description),
      extra,
      cards: [...cards],
      published: false,
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
    this.store.updateDescription(this.sanitizeDescription(description))
    this.store.setSaved(false)
  }

  updatePublished(published: boolean) {
    this.store.updatePublished(published)
    this.store.setSaved(false)
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

  private updatePredefinedFormat(
    extra?: ApiDeckExtra,
  ): ApiDeckExtra | undefined {
    const formatId = extra?.limitedFormat?.id
    if (formatId) {
      const predefinedFormat = PREDEFINED_LIMITED_FORMATS.find(
        (f) => f.id === formatId,
      )
      extra.limitedFormat = predefinedFormat
    }
    return extra
  }

  private sanitizeDescription(description?: string): string | undefined {
    return description
      ?.split('\n')
      .map((line: string) => {
        if (line.startsWith('>')) {
          // Fix for markdown quote parser
          return this.sanitizer
            .sanitize(SecurityContext.HTML, line)
            ?.replace(/&gt;/g, '>')
        } else {
          return this.sanitizer.sanitize(SecurityContext.HTML, line)
        }
      })
      .join('\n')
  }
}
