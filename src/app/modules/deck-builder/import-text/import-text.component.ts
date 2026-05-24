import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiDeckBuilder } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { finalize } from 'rxjs'

@Component({
  selector: 'app-import-text',
  templateUrl: './import-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TranslocoPipe, ReactiveFormsModule],
})
export class ImportTextComponent {
  modal = inject(NgbActiveModal)
  private readonly apiDataService = inject(ApiDataService)

  textControl = new FormControl<string>('')
  loading = signal<boolean>(false)
  errorKey = signal<string | null>(null)

  import(): void {
    const text = this.textControl.value ?? ''
    this.loading.set(true)
    this.errorKey.set(null)
    this.apiDataService
      .importDeckFromText(text)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result: ApiDeckBuilder) => this.modal.close(result),
        error: (err) => {
          if (err.status === 400) {
            this.errorKey.set('deck_builder.import_text_error_empty')
          } else if (err.status === 404) {
            this.errorKey.set('deck_builder.import_text_error_not_found')
          } else {
            this.errorKey.set('shared.unexpected_error')
          }
        },
      })
  }
}
