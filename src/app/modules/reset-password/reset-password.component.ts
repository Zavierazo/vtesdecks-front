import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core'
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiResponse } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { takeEmailActionToken } from '../../utils/email-action-security'

@UntilDestroy()
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, TranslocoPipe],
})
export class ResetPasswordComponent {
  private apiDataService = inject(ApiDataService)
  private translocoService = inject(TranslocoService)
  private token = takeEmailActionToken('/reset-password')
  readonly hasToken = signal(
    Boolean(this.token && /^[A-Za-z0-9_-]{43}$/.test(this.token)),
  )
  readonly loading = signal(false)
  readonly complete = signal(false)
  readonly errorMessage = signal<string | undefined>(undefined)

  resetPasswordForm = new FormGroup(
    {
      password: new FormControl(null, [
        Validators.required,
        Validators.minLength(8),
        this.patternValidator(/\d/, { hasNumber: true }),
      ]),
      confirmPassword: new FormControl(null, [
        Validators.required,
        Validators.minLength(8),
        this.patternValidator(/\d/, { hasNumber: true }),
      ]),
    },
    { validators: this.passwordMatchValidator },
  )

  get password() {
    return this.resetPasswordForm.get('password')
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword')
  }

  onResetPasswordSubmit(): void {
    if (
      !this.token ||
      !this.hasToken() ||
      this.loading() ||
      this.complete() ||
      this.resetPasswordForm.invalid
    ) {
      return
    }
    this.errorMessage.set(undefined)
    this.loading.set(true)
    this.apiDataService
      .resetPassword({
        token: this.token,
        password: this.resetPasswordForm.value.password ?? '',
      })
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (user: ApiResponse) => {
          this.loading.set(false)
          if (user.successful) {
            this.token = undefined
            this.complete.set(true)
            this.hasToken.set(false)
            this.resetPasswordForm.reset()
          } else {
            this.errorMessage.set(
              user.message ??
                this.translocoService.translate('reset_password.error'),
            )
          }
        },
        error: () => {
          this.loading.set(false)
          this.errorMessage.set(
            this.translocoService.translate('reset_password.error'),
          )
        },
      })
  }

  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control!.get('password')?.value
    const confirmPassword = control!.get('confirmPassword')?.value
    if (password !== confirmPassword) {
      control!.get('confirmPassword')?.setErrors({ noPasswordMatch: true })
    }
    return null
  }

  private patternValidator(
    regex: RegExp,
    error: ValidationErrors,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return {}
      }
      const valid = regex.test(control.value)
      return valid ? {} : error
    }
  }
}
