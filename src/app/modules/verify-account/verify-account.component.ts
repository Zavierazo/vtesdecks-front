import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { takeEmailActionToken } from '../../utils/email-action-security'

@UntilDestroy()
@Component({
  selector: 'app-verify-account',
  templateUrl: './verify-account.component.html',
  styleUrls: ['./verify-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class VerifyAccountComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly modalService = inject(NgbModal)
  private token = takeEmailActionToken('/verify')
  readonly hasToken = signal(
    Boolean(this.token && /^[A-Za-z0-9_-]{43}$/.test(this.token)),
  )
  readonly loading = signal(false)
  readonly complete = signal(false)
  readonly failed = signal(false)

  ngOnInit(): void {
    this.verify()
  }

  async openLogin(): Promise<void> {
    const { LoginComponent } =
      await import('../../shared/components/login/login.component')
    this.modalService.open(LoginComponent)
  }

  verify(): void {
    if (!this.token || !this.hasToken() || this.loading() || this.complete()) {
      return
    }
    this.loading.set(true)
    this.apiDataService
      .verifyAccount(this.token)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (response) => {
          this.loading.set(false)
          this.complete.set(response.successful)
          this.failed.set(!response.successful)
          this.token = undefined
          this.hasToken.set(false)
        },
        error: () => {
          this.loading.set(false)
          this.failed.set(true)
        },
      })
  }
}
