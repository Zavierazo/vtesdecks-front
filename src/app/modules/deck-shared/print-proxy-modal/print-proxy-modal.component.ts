import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  ViewChild,
} from '@angular/core'
import { FormControl } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiProxyCardOption } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { PrintProxyComponent } from '../print-proxy/print-proxy.component'

export interface ApiProxyItem {
  cardId: number
  isCrypt: boolean
  isLibrary: boolean
  amount: number
  maxAmount?: number
  set?: ApiProxyCardOption
  setOptions: ApiProxyCardOption[]
  setControl?: FormControl<string | null>
}

@UntilDestroy()
@Component({
  selector: 'app-print-proxy-modal',
  templateUrl: './print-proxy-modal.component.html',
  styleUrls: ['./print-proxy-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslocoDirective, TranslocoPipe, PrintProxyComponent],
})
export class PrintProxyModalComponent {
  modal = inject(NgbActiveModal)
  @ViewChild('printProxy') printProxy!: PrintProxyComponent

  @Input() title?: string
  @Input() cards!: ApiCard[]

  dismissModal() {
    this.modal.dismiss()
  }

  onPrint(): void {
    this.printProxy.onPrint()
  }
}
