import { Injectable, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Observable } from 'rxjs'
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component'

export interface ComponentCanDeactivate {
  canDeactivate(): boolean | Observable<boolean>
}

@Injectable({
  providedIn: 'root',
})
export class CanDeactivateComponent {
  private readonly modalService = inject(NgbModal)
  private readonly translocoService = inject(TranslocoService)

  canDeactivate(
    component: ComponentCanDeactivate,
  ): boolean | Observable<boolean> {
    const result = component.canDeactivate()
    if (typeof result === 'boolean') {
      return result ? true : this.confirmDialog()
    }
    return result
  }

  confirmDialog(): Observable<boolean> {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'md',
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      'can_deactivate_guard.title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'can_deactivate_guard.message',
    )
    return modalRef.closed
  }
}
