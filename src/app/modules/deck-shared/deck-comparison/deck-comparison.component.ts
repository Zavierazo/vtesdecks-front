import { compareCardQuantities } from '../../../utils/deck-card-diff'
import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiDeck } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, MediaService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { Observable } from 'rxjs'
import { environment } from '@environments/environment'

export interface CardDiff {
  id: number
  name: string
  currentQuantity: number
  comparisonQuantity: number
  difference: number
}

@UntilDestroy()
@Component({
  selector: 'app-deck-comparison',
  templateUrl: './deck-comparison.component.html',
  styleUrls: ['./deck-comparison.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, NgClass, NgbPopover, CardImagePipe, AsyncPipe],
})
export class DeckComparisonComponent {
  private readonly apiDataService = inject(ApiDataService)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly mediaService = inject(MediaService)

  currentDeck = input.required<ApiDeck>()
  comparisonDeckId = input.required<string>()

  comparisonDeck = signal<ApiDeck | null>(null)
  loading = signal<boolean>(true)

  isMobileOrTablet$!: Observable<boolean>
  cdnDomain = environment.cdnDomain

  cryptDiffs = computed(() => this.calculateDiffs(true))
  libraryDiffs = computed(() => this.calculateDiffs(false))

  constructor() {
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    // Watch for changes to comparisonDeckId and reload
    effect(() => {
      const deckId = this.comparisonDeckId()
      if (deckId) {
        this.loadComparisonDeck()
      }
    })
  }

  loadComparisonDeck(): void {
    this.loading.set(true)
    this.comparisonDeck.set(null) // Clear previous deck
    this.apiDataService
      .getDeck(this.comparisonDeckId())
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (deck) => {
          this.comparisonDeck.set(deck)
          this.loading.set(false)
        },
        error: () => {
          this.comparisonDeck.set(null) // Ensure deck is cleared on error
          this.loading.set(false)
        },
      })
  }

  calculateDiffs(isCrypt: boolean): CardDiff[] {
    const compDeck = this.comparisonDeck()
    if (!compDeck) {
      return []
    }
    const currentCards =
      (isCrypt ? this.currentDeck().crypt : this.currentDeck().library) ?? []
    const comparisonCards = (isCrypt ? compDeck.crypt : compDeck.library) ?? []
    return compareCardQuantities(comparisonCards, currentCards)
      .map((delta) => ({
        ...delta,
        comparisonQuantity: delta.previousQuantity,
        name:
          (isCrypt
            ? this.cryptQuery.getEntity(delta.id)
            : this.libraryQuery.getEntity(delta.id)
          )?.name ?? String(delta.id),
      }))
      .sort(
        (a, b) =>
          Math.abs(b.difference) - Math.abs(a.difference) ||
          a.name.localeCompare(b.name),
      )
  }

  getCard(cardId: string, isCrypt: boolean) {
    const id = Number(cardId)
    return isCrypt
      ? this.cryptQuery.getEntity(id)
      : this.libraryQuery.getEntity(id)
  }
}
