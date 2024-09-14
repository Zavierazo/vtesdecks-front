import { DeckBuilderQuery } from './deck-builder.query'
import { Observable, of, tap } from 'rxjs'
import { ApiDataService } from './../../services/api.data.service'
import { Injectable } from '@angular/core'
import { DeckBuilderStore } from './deck-builder.store'
import { ApiDeckBuilder } from '../../models/api-deck-builder'
import { LibraryQuery } from '../library/library.query'
import { transaction } from '@datorama/akita'
import { ApiDeck } from 'src/app/models/api-deck'
import { TranslocoService } from '@ngneat/transloco'
@Injectable({
  providedIn: 'root',
})
export class DeckBuilderService {
  constructor(
    private store: DeckBuilderStore,
    private query: DeckBuilderQuery,
    private libraryQuery: LibraryQuery,
    private apiDataService: ApiDataService,
    private translocoService: TranslocoService,
  ) {}

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
            cards: deck.cards,
            published: deck.published,
            saved: true,
          }))
          this.validateDeck()
        }),
      )
    } else if (cloneDeck) {
      this.store.update((state) => ({
        ...state,
        name: '[COPY] ' + cloneDeck.name,
        cards: [...cloneDeck.crypt!, ...cloneDeck.library!],
        published: false,
        saved: false,
      }))
      this.validateDeck()
    }

    return of({})
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
          cards: deck.cards,
          published: true,
          saved: false,
        }))
        this.validateDeck()
      }),
    )
  }

  saveDeck(): Observable<ApiDeckBuilder> {
    const deck = this.query.getValue()
    return this.apiDataService
      .saveDeckBuilder({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        cards: deck.cards,
        published: deck.published,
      } as ApiDeckBuilder)
      .pipe(
        tap((deck) => {
          this.store.update((state) => ({
            ...state,
            id: deck.id,
            name: deck.name,
            description: deck.description,
            cards: deck.cards,
            published: deck.published,
            saved: true,
          }))
          this.validateDeck()
        }),
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

  @transaction()
  updateName(name: string) {
    this.store.updateName(name)
    this.store.setSaved(false)
  }

  @transaction()
  updateDescription(description: string) {
    this.store.updateDescription(description)
    this.store.setSaved(false)
  }

  @transaction()
  updatePublished(published: boolean) {
    this.store.updatePublished(published)
    this.store.setSaved(false)
  }

  @transaction()
  addCard(id: number) {
    const type = this.libraryQuery.getEntity(id)?.type
    this.store.addCard(id, type)
    this.validateDeck()
    this.store.setSaved(false)
  }

  @transaction()
  removeCard(id: number) {
    this.store.removeCard(id)
    this.validateDeck()
    this.store.setSaved(false)
  }

  validateDeck(): boolean {
    let isValid = true
    const cryptErrors = []

    if (this.query.getCryptSize() < 12) {
      cryptErrors.push(
        this.translocoService.translate('deck_builder_service.min_crypt_cards'),
      )
      isValid = false
    }
    const groups = new Set<number>()
    for (let crypt of this.query.getCrypt()) {
      if (crypt.banned) {
        cryptErrors.push(
          this.translocoService.translate('deck_builder_service.banned_card', {
            name: crypt.name,
          }),
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
    if (librarySize < 60) {
      libraryErrors.push(
        this.translocoService.translate(
          'deck_builder_service.min_library_cards',
        ),
      )
      isValid = false
    }
    if (librarySize > 90) {
      libraryErrors.push(
        this.translocoService.translate(
          'deck_builder_service.max_library_cards',
        ),
      )
      isValid = false
    }
    for (let library of this.query.getLibrary()) {
      if (library.banned) {
        libraryErrors.push(
          this.translocoService.translate('deck_builder_service.banned_card', {
            name: library.name,
          }),
        )
        isValid = false
      }
    }
    this.store.setLibraryErrors(libraryErrors)

    return isValid
  }
}
