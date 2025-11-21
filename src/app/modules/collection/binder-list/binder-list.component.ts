import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiCollectionBinder } from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { catchError, EMPTY, switchMap } from 'rxjs'
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'
import { BinderModalComponent } from '../binder-modal/binder-modal.component'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-binder-list',
  templateUrl: './binder-list.component.html',
  styleUrls: ['./binder-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    AsyncPipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
  ],
})
export class BinderListComponent implements OnInit {
  private collectionService = inject(CollectionPrivateService)
  private collectionQuery = inject(CollectionQuery)
  private modalService = inject(NgbModal)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  binders$ = this.collectionQuery.selectBinders()

  ngOnInit() {
    this.collectionService.reset()
    this.collectionService.initialize().pipe(untilDestroyed(this)).subscribe()
  }

  onAddBinder() {
    this.modalService.open(BinderModalComponent)
  }

  onEdit(binder: ApiCollectionBinder) {
    const modalRef = this.modalService.open(BinderModalComponent)
    modalRef.componentInstance.formBinder.patchValue({
      id: binder.id,
      name: binder.name,
      icon: binder.icon,
      publicVisibility: binder.publicVisibility,
      description: binder.description,
    })
  }

  onDelete(binder: ApiCollectionBinder, deleteCards: boolean) {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = this.translocoService.translate(
      'collection.binder_delete_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      deleteCards
        ? 'collection.binder_delete_message_with_cards'
        : 'collection.binder_delete_message_without_cards',
      { binderName: binder.name },
    )
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((confirmed: boolean) => {
          if (confirmed) {
            return this.collectionService.deleteBinder(binder.id!, deleteCards)
          }
          return EMPTY
        }),
        catchError((error) => {
          if (error.status === 400 && error.error) {
            this.toastService.show(error.error, {
              classname: 'bg-danger text-light',
              delay: 5000,
            })
          } else {
            console.error('Unexpected error:', error)
            this.toastService.show(
              this.translocoService.translate('shared.unexpected_error'),
              { classname: 'bg-danger text-light', delay: 5000 },
            )
          }
          throw error
        }),
      )
      .subscribe()
  }
}
