import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiWishlistCard, WishlistPriority } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { catchError, finalize, tap } from 'rxjs'
import { CollectionApiDataService } from '../../collection/services/collection-api.data.service'
import { WishlistApiDataService } from '../services/wishlist-api.data.service'

export interface MissingWishlistCard {
  cardId: number
  cardName: string
  missing: number
}

@UntilDestroy()
@Component({
  selector: 'app-add-missing-to-wishlist-modal',
  templateUrl: './add-missing-to-wishlist-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TranslocoPipe, ReactiveFormsModule],
})
export class AddMissingToWishlistModalComponent {
  activeModal = inject(NgbActiveModal)
  private readonly collectionApiDataService = inject(CollectionApiDataService)
  private readonly wishlistApiDataService = inject(WishlistApiDataService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  loading = signal<boolean>(true)
  saving = signal<boolean>(false)
  missingCards = signal<MissingWishlistCard[]>([])

  priorityControl = new FormControl<WishlistPriority | null>(null)

  get totalMissing(): number {
    return this.missingCards().reduce((acc, card) => acc + card.missing, 0)
  }

  init(cards: { cardId: number; number: number }[]): void {
    // Merge duplicated card ids and drop empty entries
    const needed = new Map<number, number>()
    cards
      .filter((card) => card.number > 0)
      .forEach((card) =>
        needed.set(card.cardId, (needed.get(card.cardId) ?? 0) + card.number),
      )
    if (needed.size === 0) {
      this.missingCards.set([])
      this.loading.set(false)
      return
    }
    this.collectionApiDataService
      .getCardsByCardIds([...needed.keys()])
      .pipe(
        untilDestroyed(this),
        tap((ownedCards) => {
          const owned = new Map<number, number>()
          ownedCards.forEach((card) =>
            owned.set(card.cardId, (owned.get(card.cardId) ?? 0) + card.number),
          )
          const missing: MissingWishlistCard[] = []
          needed.forEach((neededNumber, cardId) => {
            const missingNumber = neededNumber - (owned.get(cardId) ?? 0)
            if (missingNumber > 0) {
              missing.push({
                cardId,
                cardName: this.getCardName(cardId),
                missing: missingNumber,
              })
            }
          })
          missing.sort((a, b) => a.cardName.localeCompare(b.cardName))
          this.missingCards.set(missing)
        }),
        catchError((error) => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          this.activeModal.dismiss()
          throw error
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe()
  }

  onAdd(): void {
    const missing = this.missingCards()
    if (this.saving() || missing.length === 0) {
      return
    }
    this.saving.set(true)
    const priority = this.priorityControl.value
    const wishlistCards: ApiWishlistCard[] = missing.map((card) => ({
      cardId: card.cardId,
      number: card.missing,
      priority,
    }))
    this.wishlistApiDataService
      .addCardsBulk(wishlistCards)
      .pipe(
        untilDestroyed(this),
        tap(() => {
          this.toastService.show(
            this.translocoService.translate('wishlist.missing_added', {
              count: this.totalMissing,
            }),
            { classname: 'bg-success text-light', delay: 5000 },
          )
          this.activeModal.close(true)
        }),
        catchError((error) => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
          throw error
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe()
  }

  private getCardName(cardId: number): string {
    const card =
      this.cryptQuery.getEntity(cardId) ?? this.libraryQuery.getEntity(cardId)
    return card?.i18n?.name ?? card?.name ?? `#${cardId}`
  }
}
