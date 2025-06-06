import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'

@Component({
  selector: 'app-import-vdb',
  templateUrl: './import-vdb.component.html',
  styleUrls: ['./import-vdb.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, TranslocoPipe],
})
export class ImportVdbComponent implements OnInit {
  modal = inject(NgbActiveModal)

  form!: FormGroup

  ngOnInit() {
    this.form = new FormGroup({
      url: new FormControl(null, Validators.required),
    })
  }

  get url(): string | undefined {
    return this.form.get('url')?.value
  }
}
