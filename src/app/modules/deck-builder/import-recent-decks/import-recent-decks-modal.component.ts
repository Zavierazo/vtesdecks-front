import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiDeckBuilder, LastVisitedDeck } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, DeckHistoryService } from '@services'
import { finalize } from 'rxjs'

@Component({
  selector: 'app-import-recent-decks-modal',
  templateUrl: './import-recent-decks-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TranslocoPipe],
})
export class ImportRecentDecksModalComponent {
  modal = inject(NgbActiveModal)
  private readonly deckHistoryService = inject(DeckHistoryService)
  private readonly apiDataService = inject(ApiDataService)

  recentDecks = signal<LastVisitedDeck[]>(
    this.deckHistoryService.getLastVisitedDecks(),
  )
  loading = signal<boolean>(false)
  errorKey = signal<string | null>(null)

  selectDeck(deckId: string): void {
    if (this.loading()) return
    this.loading.set(true)
    this.errorKey.set(null)
    this.apiDataService
      .getDeckBuilder(deckId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (deck: ApiDeckBuilder) => this.modal.close(deck),
        error: () => this.errorKey.set('shared.unexpected_error'),
      })
  }
}
