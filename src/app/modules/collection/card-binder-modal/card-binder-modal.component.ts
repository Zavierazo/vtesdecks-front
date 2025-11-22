import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
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
  selector: 'app-card-binder-modal',
  templateUrl: './card-binder-modal.component.html',
  styleUrls: ['./card-binder-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TranslocoDirective, ReactiveFormsModule, AsyncPipe],
})
export class CardBinderModalComponent {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  activeModal = inject(NgbActiveModal)
  formCardBinder = new FormGroup({
    id: new FormControl<number | null>(null),
    quantity: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(1),
    ]),
    binderId: new FormControl<number | null>(null),
  })
  binders$ = this.collectionQuery.selectBinders()
  loading$ = this.collectionQuery.selectLoading()

  get quantityControl(): FormControl<number | null> {
    return this.formCardBinder.get('quantity') as FormControl<number | null>
  }

  initAdd(card: ApiCollectionCard) {
    this.quantityControl.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(card.number),
    ])
    this.formCardBinder.patchValue({
      id: card.id,
      quantity: 1,
      binderId: card.binderId ?? null,
    })
  }

  onSave() {
    this.formCardBinder.markAllAsTouched()
    if (this.formCardBinder.valid) {
      const formValue = this.formCardBinder.value
      const id = formValue.id
      const quantity = formValue.quantity ?? 1
      const binderId = formValue.binderId ?? undefined
      if (id && quantity > 0) {
        this.collectionService
          .moveToBinder(id, quantity, binderId)
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
}
