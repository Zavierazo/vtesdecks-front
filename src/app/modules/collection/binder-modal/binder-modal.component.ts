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
import { ApiCollectionBinder } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { catchError, tap } from 'rxjs'
import { CLAN_LIST } from '../../../utils/clans'
import { DISCIPLINE_LIST } from '../../../utils/disciplines'
import { LIBRARY_TYPE_LIST } from '../../../utils/library-types'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-binder-modal',
  templateUrl: './binder-modal.component.html',
  styleUrls: ['./binder-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TranslocoDirective, ReactiveFormsModule, AsyncPipe],
})
export class BinderModalComponent {
  private collectionService = inject(CollectionPrivateService)
  private collectionQuery = inject(CollectionQuery)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  activeModal = inject(NgbActiveModal)
  disciplines = DISCIPLINE_LIST
  clans = CLAN_LIST
  types = LIBRARY_TYPE_LIST
  loading$ = this.collectionQuery.selectLoadingBackground()

  formBinder = new FormGroup({
    id: new FormControl<number | null>(null),
    name: new FormControl<string>('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    icon: new FormControl(''),
    publicVisibility: new FormControl(false),
    description: new FormControl(''),
  })

  get binderName(): FormControl<string> {
    return this.formBinder.get('name') as FormControl<string>
  }

  onSave() {
    this.formBinder.markAllAsTouched()
    if (!this.formBinder.valid) {
      return
    }
    const binderData = this.formBinder.value as ApiCollectionBinder
    if (binderData.id !== null && binderData.id !== undefined) {
      this.collectionService
        .updateBinder(binderData.id, binderData)
        .pipe(
          untilDestroyed(this),
          tap(() => this.activeModal.close(binderData)),
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
    } else {
      this.collectionService
        .addBinder(binderData)
        .pipe(
          untilDestroyed(this),
          tap(() => this.activeModal.close(binderData)),
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
