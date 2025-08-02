import { AsyncPipe, NgClass } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { catchError, distinctUntilChanged, EMPTY, switchMap, tap } from 'rxjs'
import { ToastService } from '../../../services/toast.service'
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'
import { BinderModalComponent } from '../binder-modal/binder-modal.component'
import { CardModalComponent } from '../card-modal/card-modal.component'
import { CollectionCardsListComponent } from '../collection-cards-list/collection-cards-list.component'
import { CollectionImportModalComponent } from '../collection-import-modal/collection-import-modal.component'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.scss'],
  imports: [
    TranslocoDirective,
    CollectionCardsListComponent,
    AsyncPipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
    RouterLink,
    NgClass,
  ],
})
export class CollectionComponent implements OnInit {
  private modalService = inject(NgbModal)
  private collectionService = inject(CollectionPrivateService)
  private collectionQuery = inject(CollectionQuery)
  private translocoService = inject(TranslocoService)
  private toastService = inject(ToastService)

  binders$ = this.collectionQuery.selectBinders()
  multiSelect = false

  ngOnInit() {
    this.collectionService.reset()
    this.collectionService
      .initialize()
      .pipe(
        untilDestroyed(this),
        switchMap(() => this.collectionQuery.selectQuery()),
        distinctUntilChanged(),
        switchMap(() => this.collectionService.fetchCards()),
      )
      .subscribe()
  }

  onToggleMultiSelect() {
    this.multiSelect = !this.multiSelect
  }

  onAddBinder() {
    this.modalService.open(BinderModalComponent)
  }

  onAddCard() {
    this.modalService.open(CardModalComponent, {
      size: 'xl',
      centered: true,
    })
  }

  onImport() {
    this.modalService
      .open(CollectionImportModalComponent)
      .closed.pipe(
        untilDestroyed(this),
        tap(() => this.collectionService.setPage(0)),
      )
      .subscribe()
  }

  onExport() {
    this.collectionService
      .exportCollectionAsCsv()
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  onDelete() {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = this.translocoService.translate(
      'collection.collection_delete_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'collection.collection_delete_message',
    )
    modalRef.componentInstance.okLabel =
      this.translocoService.translate('shared.delete')
    modalRef.componentInstance.okButtonType = 'btn-danger'
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((confirmed: boolean) => {
          if (confirmed) {
            return this.collectionService
              .deleteCollection()
              .pipe(switchMap(() => this.collectionService.fetchCards()))
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
