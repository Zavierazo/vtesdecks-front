import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoPipe } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

export interface LastVisitedDeck {
  id: string
  name: string
  author: string
  visitedAt: number
}

@Component({
  selector: 'app-deck-comparison-modal',
  templateUrl: './deck-comparison-modal.component.html',
  styleUrls: ['./deck-comparison-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
})
export class DeckComparisonModalComponent {
  private readonly activeModal = inject(NgbActiveModal)

  deckUrlControl = new FormControl('')
  lastVisitedDecks = signal<LastVisitedDeck[]>([])
  selectedDeckId = signal<string | null>(null)

  close(): void {
    this.activeModal.dismiss()
  }

  selectDeckByUrl(): void {
    const url = this.deckUrlControl.value
    if (!url) return

    // Extract deck ID from URL
    // Supports formats: /deck/123, https://vtesdecks.com/deck/123, etc.
    const match = url.match(/\/deck\/([a-zA-Z0-9-]+)/)
    if (match && match[1]) {
      this.activeModal.close({ deckId: match[1] })
    }
  }

  selectDeck(deckId: string): void {
    this.activeModal.close({ deckId })
  }

  setLastVisitedDecks(decks: LastVisitedDeck[]): void {
    this.lastVisitedDecks.set(decks)
  }
}
