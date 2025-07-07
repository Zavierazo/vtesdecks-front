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
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { BehaviorSubject, catchError, tap } from 'rxjs'
import { ApiCollectionImport } from '../../../models/api-collection-import'
import { ToastService } from '../../../services/toast.service'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-collection-import-modal',
  templateUrl: './collection-import-modal.component.html',
  styleUrls: ['./collection-import-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, TranslocoDirective, ReactiveFormsModule, AsyncPipe],
})
export class CollectionImportModalComponent {
  private collectionQuery = inject(CollectionQuery)
  private collectionService = inject(CollectionPrivateService)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)

  activeModal = inject(NgbActiveModal)

  formImport = new FormGroup({
    format: new FormControl<'VTESDECKS' | 'TWD' | 'LACKEY' | 'VDB'>(
      'VTESDECKS',
    ),
    file: new FormControl<File | null>(null, Validators.required),
    binderId: new FormControl<number | null>(null),
  })
  binders$ = this.collectionQuery.selectBinders()
  loading$ = this.collectionQuery.selectLoadingBackground()
  errors$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([])

  onSave() {
    this.formImport.markAllAsTouched()
    const { format, file, binderId } = this.formImport.value
    if (this.formImport.valid && format && file) {
      this.collectionService
        .importCollection(format, file, binderId ?? undefined)
        .pipe(
          untilDestroyed(this),
          tap((response: ApiCollectionImport) => {
            if (response.success) {
              this.toastService.show(
                this.translocoService.translate(
                  'collection.collection_imported',
                ),
                {
                  classname: 'bg-success text-light',
                  delay: 5000,
                },
              )
              this.activeModal.close()
            } else {
              this.errors$.next(response.errors ?? [])
              this.toastService.show(
                this.translocoService.translate('shared.validation_error'),
                { classname: 'bg-danger text-light', delay: 5000 },
              )
            }
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

  get fileControl(): FormControl<File | null> {
    return this.formImport.get('file') as FormControl<File | null>
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.formImport.get('file')?.setValue(input.files[0])
    } else {
      this.formImport.get('file')?.setValue(null)
    }
  }
}
