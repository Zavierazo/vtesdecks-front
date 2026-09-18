import { OfflineComponent } from '../../offline/offline.component'
import { AsyncPipe, NgClass } from '@angular/common'
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
import { ApiUserSettings, CARD_PRINTING_PREFERENCES } from '@models'
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { Observable, finalize } from 'rxjs'
import { ConnectivityService } from '../../../services/connectivity.service'

@UntilDestroy()
@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OfflineComponent,
    TranslocoDirective,
    ReactiveFormsModule,
    NgbAlert,
    NgClass,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class UserSettingsComponent implements OnInit {
  private authQuery = inject(AuthQuery)
  private authService = inject(AuthService)
  private changeDetectorRef = inject(ChangeDetectorRef)
  private translocoService = inject(TranslocoService)

  readonly authenticated$ = this.authQuery.selectAuthenticated()

  email$!: Observable<string | undefined>

  displayName$!: Observable<string | undefined>

  profileImage$!: Observable<string | undefined>

  private savedProfile!: ApiUserSettings
  profileForm!: FormGroup
  passwordForm!: FormGroup
  readonly connectivity = inject(ConnectivityService)
  saving: 'profile' | 'password' | null = null
  feedback = {
    profile: { message: '', successful: false },
    password: { message: '', successful: false },
  }

  cardPrintingPreferences = CARD_PRINTING_PREFERENCES

  ngOnInit() {
    this.email$ = this.authQuery.selectEmail()
    this.displayName$ = this.authQuery.selectDisplayName()
    this.profileImage$ = this.authQuery.selectProfileImage()
    const profileImage = this.authQuery.getProfileImage()
    this.profileForm = new FormGroup({
      displayName: new FormControl(
        this.authQuery.getDisplayName(),
        Validators.required,
      ),
      profileImage: new FormControl(
        this.isGravatarUrl(profileImage) ? '' : profileImage,
      ),
      cardPrintingPreference: new FormControl(
        this.authQuery.getCardPrintingPreference(),
      ),
    })
    this.savedProfile = this.profileForm.getRawValue()
    this.passwordForm = new FormGroup(
      {
        password: new FormControl(null, Validators.required),
        newPassword: new FormControl(null, [
          Validators.required,
          Validators.minLength(8),
          this.patternValidator(/\d/, { hasNumber: true }),
        ]),
        confirmNewPassword: new FormControl(null, [
          Validators.required,
          Validators.minLength(8),
          this.patternValidator(/\d/, { hasNumber: true }),
        ]),
      },
      { validators: this.passwordMatchValidator },
    )
  }

  get displayName() {
    return this.profileForm.get('displayName')
  }

  get profileImage() {
    return this.profileForm.get('profileImage')
  }

  get password() {
    return this.passwordForm.get('password')
  }

  get newPassword() {
    return this.passwordForm.get('newPassword')
  }

  get confirmNewPassword() {
    return this.passwordForm.get('confirmNewPassword')
  }

  get profileChanged(): boolean {
    const current = this.profileForm.getRawValue()
    return (
      current.displayName !== this.savedProfile.displayName ||
      (current.profileImage || '') !== (this.savedProfile.profileImage || '') ||
      current.cardPrintingPreference !==
        this.savedProfile.cardPrintingPreference
    )
  }

  saveProfile() {
    if (
      !this.profileChanged ||
      this.profileForm.invalid ||
      this.saving ||
      this.connectivity.offline()
    ) {
      return
    }
    this.save('profile', this.profileForm.getRawValue())
  }

  changePassword() {
    if (
      this.passwordForm.invalid ||
      this.saving ||
      this.connectivity.offline()
    ) {
      return
    }
    // The existing endpoint also writes profile fields. Preserve the saved
    // profile, never the independently edited profile form.
    const profileImage = this.authQuery.getProfileImage()
    this.save('password', {
      displayName: this.authQuery.getDisplayName() ?? '',
      profileImage: this.isGravatarUrl(profileImage) ? '' : profileImage,
      cardPrintingPreference: this.authQuery.getCardPrintingPreference(),
      password: this.password?.value,
      newPassword: this.newPassword?.value,
    })
  }

  private isGravatarUrl(value: string | undefined): boolean {
    if (!value) {
      return false
    }
    try {
      const url = new URL(value)
      return (
        (url.protocol === 'https:' || url.protocol === 'http:') &&
        (url.hostname === 'gravatar.com' ||
          url.hostname.endsWith('.gravatar.com'))
      )
    } catch {
      return false
    }
  }

  private save(section: 'profile' | 'password', settings: ApiUserSettings) {
    this.saving = section
    this.feedback[section].message = ''
    this.authService
      .updateSettings(settings)
      .pipe(
        untilDestroyed(this),
        finalize(() => {
          this.saving = null
          this.changeDetectorRef.markForCheck()
        }),
      )
      .subscribe({
        next: (response) => {
          this.feedback[section] = {
            successful: response.successful,
            message: response.successful
              ? this.translocoService.translate(
                  'user_profile.' + section + '_saved',
                )
              : response.message ||
                this.translocoService.translate('user_profile.error'),
          }
          if (response.successful && section === 'profile') {
            this.savedProfile = { ...settings }
          }
          if (response.successful && section === 'password') {
            this.passwordForm.reset()
          }
          this.changeDetectorRef.markForCheck()
        },
        error: () => {
          this.feedback[section] = {
            successful: false,
            message: this.translocoService.translate('user_profile.error'),
          }
        },
      })
  }

  private patternValidator(
    regex: RegExp,
    error: ValidationErrors,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null
      }
      const valid = regex.test(control.value)
      return valid ? null : error
    }
  }

  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control!.get('newPassword')?.value
    const confirmPassword = control!.get('confirmNewPassword')?.value
    return password !== confirmPassword ? { noPasswordMatch: true } : null
  }
}
