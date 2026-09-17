import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { LocalDeckDraftsService } from '../../../services/local-deck-drafts.service'

@Component({
  selector: 'app-local-drafts-modal',
  templateUrl: './local-drafts-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslocoDirective],
})
export class LocalDraftsModalComponent {
  readonly modal = inject(NgbActiveModal)
  readonly drafts = inject(LocalDeckDraftsService)
  deletingId?: string

  constructor() {
    this.drafts.reload()
  }

  remove(id: string): void {
    if (this.drafts.remove(id)) {
      this.deletingId = undefined
    }
  }
}
