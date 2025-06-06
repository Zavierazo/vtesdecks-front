import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'
import {
  TranslocoService,
  TranslocoDirective,
  TranslocoPipe,
} from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable, tap } from 'rxjs'
import { ApiUserSettings } from '../../../models/api-user-settings'
import { ApiResponse } from './../../../models/api-response'
import { AuthQuery } from './../../../state/auth/auth.query'
import { AuthService } from './../../../state/auth/auth.service'
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap'
import { NgClass, AsyncPipe } from '@angular/common'

@UntilDestroy()
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    NgbAlert,
    NgClass,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class ProfileComponent implements OnInit {
  private authQuery = inject(AuthQuery)
  private authService = inject(AuthService)
  private changeDetectorRef = inject(ChangeDetectorRef)
  private translocoService = inject(TranslocoService)

  email$!: Observable<string | undefined>

  displayName$!: Observable<string | undefined>

  profileImage$!: Observable<string | undefined>

  form!: FormGroup

  message!: string | undefined

  successful!: boolean

  ngOnInit() {
    this.email$ = this.authQuery.selectEmail()
    this.displayName$ = this.authQuery.selectDisplayName()
    this.profileImage$ = this.authQuery.selectProfileImage()
    this.form = new FormGroup(
      {
        displayName: new FormControl(
          this.authQuery.getDisplayName(),
          Validators.required,
        ),
        password: new FormControl(null),
        newPassword: new FormControl(null, [
          Validators.minLength(8),
          this.patternValidator(/\d/, { hasNumber: true }),
        ]),
        confirmNewPassword: new FormControl(null, [
          Validators.minLength(8),
          this.patternValidator(/\d/, { hasNumber: true }),
        ]),
      },
      { validators: this.passwordMatchValidator },
    )
  }

  get displayName() {
    return this.form.get('displayName')
  }

  get password() {
    return this.form.get('password')
  }

  get newPassword() {
    return this.form.get('newPassword')
  }

  get confirmNewPassword() {
    return this.form.get('confirmNewPassword')
  }

  submit() {
    if (this.form.invalid) {
      return
    }
    const settings: ApiUserSettings = {
      displayName: this.form.get('displayName')!.value,
      password: this.form.get('password')?.value,
      newPassword: this.form.get('newPassword')?.value,
    }
    this.authService
      .updateSettings(settings)
      .pipe(
        untilDestroyed(this),
        tap((response: ApiResponse) => {
          this.successful = response.successful
          this.message = response.message
        }),
      )
      .subscribe({
        complete: () => {
          this.changeDetectorRef.detectChanges()
        },
        error: () => {
          this.successful = false
          this.message = this.translocoService.translate('user_profile.error')
          this.changeDetectorRef.detectChanges()
        },
      })
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

  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control!.get('newPassword')?.value
    const confirmPassword = control!.get('confirmNewPassword')?.value
    if (password !== confirmPassword) {
      control!.get('confirmNewPassword')?.setErrors({ noPasswordMatch: true })
    }
    return null
  }
}
