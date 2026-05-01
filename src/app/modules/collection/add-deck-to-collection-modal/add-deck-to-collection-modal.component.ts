import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCollectionCard } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { catchError, finalize, switchMap, tap } from 'rxjs'
import { LastVisitedDeck } from '../../../models/last-visited-deck'
import { DeckHistoryService } from '../../../services/deck-history.service'
import { CollectionPrivateService } from '../state/collection-private.service'

@UntilDestroy()
@Component({
  selector: 'app-add-deck-to-collection-modal',
  templateUrl: './add-deck-to-collection-modal.component.html',
  styleUrls: ['./add-deck-to-collection-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, TranslocoPipe],
})
export class AddDeckToCollectionModalComponent {
  private readonly activeModal = inject(NgbActiveModal)
  private readonly apiDataService = inject(ApiDataService)
  private readonly collectionService = inject(CollectionPrivateService)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly deckHistoryService = inject(DeckHistoryService)

  deckUrlControl = new FormControl<string>('', { nonNullable: true })
  copiesControl = new FormControl<number>(1, {
    nonNullable: true,
    validators: [Validators.min(1), Validators.max(9)],
  })

  private readonly deckUrlValue = toSignal(this.deckUrlControl.valueChanges, {
    initialValue: '',
  })

  lastVisitedDecks = signal<LastVisitedDeck[]>(
    this.deckHistoryService.getLastVisitedDecks(),
  )
  selectedRecentDeck = signal<LastVisitedDeck | null>(null)
  isLoading = signal<boolean>(false)

  canAdd = computed(
    () =>
      !this.isLoading() &&
      (!!this.deckUrlValue() || this.selectedRecentDeck() !== null),
  )

  onSelectRecentDeck(deck: LastVisitedDeck): void {
    if (this.selectedRecentDeck()?.id === deck.id) {
      this.selectedRecentDeck.set(null)
    } else {
      this.selectedRecentDeck.set(deck)
      this.deckUrlControl.setValue('')
    }
  }

  onAddToCollection(): void {
    const selectedDeck = this.selectedRecentDeck()
    if (selectedDeck) {
      this.addDeckById(selectedDeck.id)
      return
    }

    const url = this.deckUrlControl.value
    if (!url) return

    const match = url.match(/\/deck\/([a-zA-Z0-9-]+)/)
    if (!match || !match[1]) {
      this.toastService.show(
        this.translocoService.translate('collection.add_deck_invalid_url'),
        { classname: 'bg-danger text-light', delay: 5000 },
      )
      return
    }

    this.addDeckById(match[1])
  }

  private addDeckById(deckId: string): void {
    if (this.isLoading()) return
    this.isLoading.set(true)
    this.deckUrlControl.disable()

    this.apiDataService
      .getDeck(deckId)
      .pipe(
        untilDestroyed(this),
        switchMap((fullDeck) => {
          if (!fullDeck) {
            throw new Error('Failed to load deck details')
          }

          const cards = [...(fullDeck.crypt || []), ...(fullDeck.library || [])]
          const copies = this.copiesControl.value
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

          const totalCards =
            ((fullDeck.stats?.crypt ?? 0) + (fullDeck.stats?.library ?? 0)) *
            copies

          return this.collectionService.addCardsBulk(collectionCards).pipe(
            tap(() => {
              this.toastService.show(
                this.translocoService.translate(
                  'collection.deck_cards_added_successfully',
                  {
                    deckName: fullDeck.name,
                    cardCount: totalCards,
                  },
                ),
                { classname: 'bg-success text-light', delay: 5000 },
              )
              this.activeModal.close(true)
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
          this.isLoading.set(false)
          this.deckUrlControl.enable()
        }),
      )
      .subscribe()
  }

  onCancel(): void {
    this.activeModal.dismiss(false)
  }
}
