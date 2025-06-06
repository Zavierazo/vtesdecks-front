import { Component, OnInit, inject } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoService, TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { switchMap, take } from 'rxjs'
import { ApiResponse } from '../../models/api-response'
import { ApiDataService } from '../../services/api.data.service'
import { ToastService } from '../../services/toast.service'


@UntilDestroy()
@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    TranslocoPipe
],
})
export class ResetPasswordComponent implements OnInit {
  private apiDataService = inject(ApiDataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private translocoService = inject(TranslocoService);

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

  ngOnInit() {}

  get password() {
    return this.resetPasswordForm.get('password')
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword')
  }

  onResetPasswordSubmit(): void {
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        take(1),
        switchMap((params) =>
          this.apiDataService.resetPassword(
            {
              email: params['email'],
              password: this.resetPasswordForm.value.password ?? '',
            },
            params['token'],
          ),
        ),
      )
      .subscribe({
        next: (user: ApiResponse) => {
          if (user.successful) {
            this.toastService.show(
              this.translocoService.translate('reset_password.success'),
              { classname: 'bg-success text-light', delay: 10000 },
            )
            this.router.navigate(['/'])
          } else {
            this.toastService.show(
              user.message ??
                this.translocoService.translate('reset_password.error'),
              { classname: 'bg-danger text-light', delay: 10000 },
            )
          }
        },
        error: (error) => {
          console.error(error.message)
          this.toastService.show(
            this.translocoService.translate('reset_password.error'),
            { classname: 'bg-danger text-light', delay: 10000 },
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
    return (control: AbstractControl): { [key: string]: any } => {
      if (!control.value) {
        return {}
      }
      const valid = regex.test(control.value)
      return valid ? {} : error
    }
  }
}
