import { Component, Input, OnInit } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
    imports: [TranslocoDirective]
})
export class ConfirmDialogComponent implements OnInit {
  @Input() title!: string
  @Input() message!: string
  @Input() okLabel = 'shared.ok'
  @Input() cancelLabel = 'shared.cancel'

  constructor(public modal: NgbActiveModal) {}

  ngOnInit() {}
}
