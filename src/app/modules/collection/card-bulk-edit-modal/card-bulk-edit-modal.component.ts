import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCollectionCard } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { catchError, tap } from 'rxjs'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-card-bulk-edit-modal',
  templateUrl: './card-bulk-edit-modal.component.html',
  styleUrls: ['./card-bulk-edit-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TranslocoDirective, ReactiveFormsModule, AsyncPipe],
})
export class CardBulkEditModalComponent {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  activeModal = inject(NgbActiveModal)
  cards!: ApiCollectionCard[]
  formBulkEdit = new FormGroup({
    binderId: new FormControl<number | null>(null),
    condition: new FormControl<string | null>(null),
    language: new FormControl<string | null>(null),
  })
  binders$ = this.collectionQuery.selectBinders()
  loading$ = this.collectionQuery.selectLoading()

  init(cards: ApiCollectionCard[]) {
    this.cards = cards
  }

  get invalidBulkEdit() {
    return (
      (this.formBulkEdit.get('binderId')?.value === null &&
        this.formBulkEdit.get('condition')?.value === null &&
        this.formBulkEdit.get('language')?.value === null) ||
      this.formBulkEdit.invalid
    )
  }

  onSave() {
    if (!this.invalidBulkEdit) {
      const formValue = this.formBulkEdit.value
      const ids = this.cards
        .map((card) => card.id)
        .filter((id) => id !== undefined && id !== null)
      this.collectionService
        .bulkEditCards(
          ids,
          formValue.binderId ? formValue.binderId : undefined,
          formValue.condition ? formValue.condition : undefined,
          formValue.language ? formValue.language : undefined,
        )
        .pipe(
          untilDestroyed(this),
          tap(() => this.activeModal.close()),
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
}
