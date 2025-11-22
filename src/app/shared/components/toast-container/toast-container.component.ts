import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef, inject } from '@angular/core'
import { NgbToast } from '@ng-bootstrap/ng-bootstrap'
import { ToastService } from '@services'

@Component({
  selector: 'app-toasts',
  template: `
    @for (toast of toastService.toasts; track toast) {
      <ngb-toast
        [class]="toast.classname"
        [autohide]="true"
        [delay]="toast.delay || 5000"
        (hidden)="toastService.remove(toast)"
      >
        @if (isTemplate(toast)) {
          <ng-template [ngTemplateOutlet]="toast.textOrTpl" />
        } @else {
          {{ toast.textOrTpl }}
        }
      </ngb-toast>
    }
  `,
  host: {
    class: 'toast-container position-fixed top-0 end-0 p-3',
    style: 'z-index: 1200; margin-top: 4rem;',
  },
  imports: [NgbToast, NgTemplateOutlet],
})
export class ToastsContainer {
  toastService = inject(ToastService)

  isTemplate(toast: { textOrTpl: TemplateRef<unknown> }) {
    return toast.textOrTpl instanceof TemplateRef
  }
}
