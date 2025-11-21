import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiContact } from '@models'
import { ApiDataService } from './../../services/api.data.service'
import { AuthQuery } from './../../state/auth/auth.query'

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, TranslocoPipe],
})
export class ContactComponent implements OnInit {
  private readonly authQuery = inject(AuthQuery)
  private readonly apiDataService = inject(ApiDataService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  form!: FormGroup

  error = false

  successful = false

  ngOnInit() {
    this.form = new FormGroup({
      name: new FormControl(
        this.authQuery.getDisplayName(),
        Validators.required,
      ),
      email: new FormControl(this.authQuery.getEmail(), [
        Validators.required,
        Validators.email,
      ]),
      subject: new FormControl(null, Validators.required),
      message: new FormControl(null, Validators.required),
    })
  }

  get name() {
    return this.form.get('name')
  }

  get email() {
    return this.form.get('email')
  }

  get subject() {
    return this.form.get('subject')
  }

  get message() {
    return this.form.get('message')
  }

  submit() {
    const contact = this.form.value as ApiContact
    this.apiDataService.contact(contact).subscribe({
      complete: () => {
        this.subject?.reset()
        this.message?.reset()
        this.successful = true
        this.changeDetectorRef.detectChanges()
      },
      error: () => {
        this.error = true
        this.changeDetectorRef.detectChanges()
      },
    })
  }
}
