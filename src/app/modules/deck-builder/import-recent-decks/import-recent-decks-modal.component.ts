import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { LastVisitedDeck } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckHistoryService } from '@services'

@Component({
  selector: 'app-import-recent-decks-modal',
  templateUrl: './import-recent-decks-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TranslocoPipe],
})
export class ImportRecentDecksModalComponent {
  modal = inject(NgbActiveModal)
  private readonly deckHistoryService = inject(DeckHistoryService)

  recentDecks = signal<LastVisitedDeck[]>(
    this.deckHistoryService.getLastVisitedDecks(),
  )

  selectDeck(deckId: string): void {
    this.modal.close(deckId)
  }
}
