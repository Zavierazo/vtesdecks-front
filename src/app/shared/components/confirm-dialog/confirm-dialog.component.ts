import { NgClass } from '@angular/common'
import { Component, Input, inject } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  imports: [TranslocoDirective, NgClass],
})
export class ConfirmDialogComponent {
  modal = inject(NgbActiveModal)

  @Input() title!: string
  @Input() message!: string
  @Input() okLabel = 'shared.ok'
  @Input() okButtonType = 'btn-primary'
  @Input() cancelLabel = 'shared.cancel'
}
