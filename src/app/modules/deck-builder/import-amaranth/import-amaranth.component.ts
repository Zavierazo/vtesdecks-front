import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiDeckBuilder } from '@models'
import { ApiDataService } from '@services'
import { finalize } from 'rxjs'

@Component({
  selector: 'app-import-amaranth',
  templateUrl: './import-amaranth.component.html',
  styleUrls: ['./import-amaranth.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, TranslocoPipe],
})
export class ImportAmaranthComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private readonly apiDataService = inject(ApiDataService)

  form!: FormGroup
  loading = signal<boolean>(false)
  errorKey = signal<string | null>(null)

  ngOnInit() {
    this.form = new FormGroup({
      url: new FormControl(null, Validators.required),
    })
  }

  get url(): string | undefined {
    return this.form.get('url')?.value
  }

  import(): void {
    const url = this.url
    if (!url) return
    this.loading.set(true)
    this.errorKey.set(null)
    this.apiDataService
      .getDeckBuilderImport('AMARANTH', url)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result: ApiDeckBuilder) => this.modal.close(result),
        error: () => this.errorKey.set('shared.unexpected_error'),
      })
  }
}
