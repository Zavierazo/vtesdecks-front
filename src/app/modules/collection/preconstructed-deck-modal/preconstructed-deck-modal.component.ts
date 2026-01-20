import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterLink } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCollectionCard, ApiDeck } from '@models'
import {
  NgbActiveModal,
  NgbProgressbarModule,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { DecksQuery } from '@state/decks/decks.query'
import { DecksService } from '@state/decks/decks.service'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { BehaviorSubject, catchError, finalize, switchMap, tap } from 'rxjs'
import { CollectionPrivateService } from '../state/collection-private.service'

@UntilDestroy()
@Component({
  selector: 'app-preconstructed-deck-modal',
  templateUrl: './preconstructed-deck-modal.component.html',
  styleUrls: ['./preconstructed-deck-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    AsyncPipe,
    NgbProgressbarModule,
    InfiniteScrollDirective,
    RouterLink,
    TranslocoPipe,
  ],
})
export class PreconstructedDeckModalComponent implements OnInit, OnDestroy {
  private readonly activeModal = inject(NgbActiveModal)
  private readonly decksService = inject(DecksService)
  private readonly decksQuery = inject(DecksQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly collectionService = inject(CollectionPrivateService)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  private readonly addingCardsSubject = new BehaviorSubject<boolean>(false)
  private readonly deckCopiesMap = new Map<string, FormControl<number>>()

  isLoading$ = this.decksQuery.selectLoading()
  decks$ = this.decksQuery.selectAll()
  total$ = this.decksQuery.selectTotal()
  addingCards$ = this.addingCardsSubject.asObservable()

  ngOnInit(): void {
    // Initialize the decks service with preconstructed filter
    this.decksService.init({ type: 'PRECONSTRUCTED' })
    // Load initial decks
    this.loadMoreDecks()
  }

  ngOnDestroy(): void {
    // Clean up FormControls to prevent memory leaks
    this.deckCopiesMap.clear()
  }

  onScroll(): void {
    if (this.decksQuery.getHasMore()) {
      this.loadMoreDecks()
    }
  }

  private loadMoreDecks(): void {
    this.decksService
      .getMore()
      .pipe(
        untilDestroyed(this),
        catchError((error) => {
          console.error('Error loading preconstructed decks:', error)
          this.toastService.show(
            this.translocoService.translate('shared.error_loading_data'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          throw error
        }),
      )
      .subscribe()
  }

  onAddDeckToCollection(deck: ApiDeck): void {
    this.addingCardsSubject.next(true)
    this.apiDataService
      .getDeck(deck.id)
      .pipe(
        untilDestroyed(this),
        switchMap((fullDeck) => {
          if (!fullDeck) {
            throw new Error('Failed to load deck details')
          }

          const cards = [...(fullDeck.crypt || []), ...(fullDeck.library || [])]
          const copies = this.getDeckCopies(deck.id)
          const collectionCards: ApiCollectionCard[] = []
          for (const card of cards) {
            const collectionCard: ApiCollectionCard = {
              cardId: card.id,
              set: fullDeck.set,
              number: card.number * copies,
              language: 'EN',
            }
            collectionCards.push(collectionCard)
          }

          // Use bulk add endpoint for better performance
          return this.collectionService.addCardsBulk(collectionCards).pipe(
            tap(() => {
              this.toastService.show(
                this.translocoService.translate(
                  'collection.deck_cards_added_successfully',
                  {
                    deckName: deck.name,
                    cardCount: (deck.stats.crypt + deck.stats.library) * copies,
                  },
                ),
                { classname: 'bg-success text-light', delay: 5000 },
              )
            }),
          )
        }),
        catchError((error) => {
          console.error('Error adding deck cards to collection:', error)
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          throw error
        }),
        finalize(() => {
          this.addingCardsSubject.next(false)
        }),
      )
      .subscribe()
  }

  onCancel(): void {
    this.activeModal.dismiss(false)
  }

  private getDeckCopies(deckId: string): number {
    const control = this.deckCopiesMap.get(deckId)
    return control ? control.value : 1
  }

  getDeckCopiesControl(deckId: string): FormControl<number> {
    if (!this.deckCopiesMap.has(deckId)) {
      const control = new FormControl<number>(1, {
        nonNullable: true,
        validators: [Validators.min(1), Validators.max(9)],
      })
      this.deckCopiesMap.set(deckId, control)
    }
    return this.deckCopiesMap.get(deckId)!
  }
}
