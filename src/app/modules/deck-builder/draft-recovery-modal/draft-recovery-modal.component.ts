import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-draft-recovery-modal',
  templateUrl: './draft-recovery-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class DraftRecoveryModalComponent {
  modal = inject(NgbActiveModal)
}
