import { AsyncPipe } from '@angular/common'
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core'

// Type declaration for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (element: Element, config: any) => void
        }
      }
    }
  }
}

import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiResponse, ApiUser } from '@models'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { ReCaptchaV3Service } from 'ng-recaptcha-2'
import { Observable, switchMap } from 'rxjs'
import { environment } from 'src/environments/environment'

export enum Tabs {
  Login,
  SignUp,
  ForgotPassword,
}
@UntilDestroy()
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [TranslocoDirective, ReactiveFormsModule, AsyncPipe, TranslocoPipe],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  activeModal = inject(NgbActiveModal)
  private recaptchaV3Service = inject(ReCaptchaV3Service)
  private authService = inject(AuthService)
  private authQuery = inject(AuthQuery)
  private toastService = inject(ToastService)

  @Input()
  tab = Tabs.Login

  Tabs = Tabs

  isLoading$!: Observable<boolean>

  loginForm = new FormGroup({
    username: new FormControl(null, Validators.required),
    password: new FormControl(null, Validators.required),
    remember: new FormControl(true),
  })

  registerForm = new FormGroup(
    {
      username: new FormControl(null, Validators.required),
      email: new FormControl(null, [Validators.required, Validators.email]),
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
      terms: new FormControl(false, Validators.requiredTrue),
    },
    {
      validators: this.passwordMatchValidator,
    },
  )

  forgotPasswordForm = new FormGroup({
    email: new FormControl(null, [Validators.required, Validators.email]),
  })

  ngOnInit() {
    this.isLoading$ = this.authQuery.selectLoading()
    this.initializeGoogleSignIn()
  }

  ngAfterViewInit() {
    const element = document.getElementsByClassName(
      'grecaptcha-badge',
    )[0] as HTMLElement
    if (element) {
      element.style.visibility = 'visible'
    }
    this.initializeGoogleSignInButtons()
  }

  ngOnDestroy() {
    const element = document.getElementsByClassName(
      'grecaptcha-badge',
    )[0] as HTMLElement
    if (element) {
      element.style.visibility = 'hidden'
    }
  }

  switchTab(tab: Tabs) {
    this.tab = tab
  }

  get loginUsername() {
    return this.loginForm.get('username')
  }

  get loginPassword() {
    return this.loginForm.get('password')
  }

  initializeGoogleSignIn() {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: environment.googleAccounts.clientId,
        callback: (response: { credential: string }) =>
          this.handleCredentialResponse(response),
      })
      window.google.accounts.id.prompt()
    }
  }

  initializeGoogleSignInButtons() {
    if (window.google?.accounts?.id) {
      const googleSignInButton = document.getElementsByName(
        'google-signin-button',
      )
      for (const button of Array.from(googleSignInButton)) {
        window.google.accounts.id.renderButton(button, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
        })
      }
    }
  }

  handleCredentialResponse(response: { credential: string }) {
    const token = response.credential
    this.authService
      .loginOauth(token, this.loginForm.value.remember ?? false)
      .subscribe({
        next: (user: ApiUser) => {
          if (user.token) {
            this.activeModal.close()
          } else {
            console.warn(user.message)
            this.toastService.show(user.message!, {
              classname: 'bg-danger text-light',
              delay: 5000,
            })
          }
        },
        error: (error) => {
          console.error(error.message)
          this.toastService.show(error.message, {
            classname: 'bg-danger text-light',
            delay: 5000,
          })
        },
      })
  }

  onLoginSubmit() {
    this.recaptchaV3Service
      .execute('importantAction')
      .pipe(
        untilDestroyed(this),
        switchMap((token: string) =>
          this.authService.generateToken(
            this.loginForm.value.username ?? '',
            this.loginForm.value.password ?? '',
            this.loginForm.value.remember ?? false,
            token,
          ),
        ),
      )
      .subscribe({
        next: (user: ApiUser) => {
          if (user.token) {
            this.activeModal.close()
          } else {
            console.warn(user.message)
            this.toastService.show(user.message!, {
              classname: 'bg-danger text-light',
              delay: 5000,
            })
          }
        },
        error: (error) => {
          console.error(error.message)
          this.toastService.show(error.message, {
            classname: 'bg-danger text-light',
            delay: 5000,
          })
        },
      })
  }

  get registerUsername() {
    return this.registerForm.get('username')
  }

  get registerEmail() {
    return this.registerForm.get('email')
  }

  get registerPassword() {
    return this.registerForm.get('password')
  }

  get registerConfirmPassword() {
    return this.registerForm.get('confirmPassword')
  }

  get registerTerms() {
    return this.registerForm.get('terms')
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

  onRegisterSubmit() {
    this.recaptchaV3Service
      .execute('importantAction')
      .pipe(
        untilDestroyed(this),
        switchMap((token: string) =>
          this.authService.register(
            this.registerForm.value.username ?? '',
            this.registerForm.value.email ?? '',
            this.registerForm.value.password ?? '',
            this.registerForm.value.confirmPassword ?? '',
            token,
          ),
        ),
      )
      .subscribe({
        next: (user: ApiResponse) => {
          if (user.successful) {
            this.toastService.show(user.message!, {
              classname: 'bg-success text-light',
              delay: 30000,
            })
            this.activeModal.close()
          } else {
            console.warn(user.message)
            this.toastService.show(user.message!, {
              classname: 'bg-danger text-light',
              delay: 10000,
            })
          }
        },
        error: (error) => {
          console.error(error.message)
          this.toastService.show(error.message, {
            classname: 'bg-danger text-light',
            delay: 10000,
          })
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

  get forgotPasswordEmail() {
    return this.forgotPasswordForm.get('email')
  }

  onForgotPasswordSubmit(): void {
    this.recaptchaV3Service
      .execute('importantAction')
      .pipe(
        untilDestroyed(this),
        switchMap((token: string) =>
          this.authService.forgotPassword(
            this.forgotPasswordForm.value.email ?? '',
            token,
          ),
        ),
      )
      .subscribe({
        next: (user: ApiResponse) => {
          if (user.successful) {
            this.toastService.show(user.message!, {
              classname: 'bg-success text-light',
              delay: 30000,
            })
            this.activeModal.close()
          } else {
            console.warn(user.message)
            this.toastService.show(user.message!, {
              classname: 'bg-danger text-light',
              delay: 10000,
            })
          }
        },
        error: (error) => {
          console.error(error.message)
          this.toastService.show(error.message, {
            classname: 'bg-danger text-light',
            delay: 10000,
          })
        },
      })
  }
}
