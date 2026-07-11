import {
  Component,
  inject,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-delete-dialog',
  templateUrl: './delete-dialog.component.html',
  styleUrls: ['./delete-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslocoDirective],
})
export class DeleteDialogComponent {
  modal = inject(NgbActiveModal)

  @Input() titleLabel!: string
  @Input() messageLabel!: string
}
