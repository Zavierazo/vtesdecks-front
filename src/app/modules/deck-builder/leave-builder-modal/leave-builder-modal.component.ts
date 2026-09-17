import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'

@Component({
  selector: 'app-leave-builder-modal',
  templateUrl: './leave-builder-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class LeaveBuilderModalComponent {
  readonly modal = inject(NgbActiveModal)
  readonly builder = inject(DeckBuilderService)

  keep(): void {
    this.builder.saveDraft()
    if (!this.builder.draftStorageError()) {
      this.modal.close(true)
    }
  }

  discard(): void {
    if (this.builder.discardCurrentDraft()) {
      this.modal.close(true)
    }
  }
}
