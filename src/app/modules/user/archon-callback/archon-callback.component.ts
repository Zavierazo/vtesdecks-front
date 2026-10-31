import { HttpErrorResponse } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import {
  archonErrorKey,
  takeArchonCallback,
} from '../../../utils/archon-callback'

@UntilDestroy()
@Component({
  imports: [TranslocoDirective, RouterLink],
  selector: 'app-archon-callback',
  templateUrl: './archon-callback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchonCallbackComponent implements OnInit {
  private readonly api = inject(ApiDataService)
  private readonly auth = inject(AuthQuery)
  readonly message = signal('loading')
  readonly busy = signal(false)
  readonly successful = signal(false)
  private started = false

  ngOnInit(): void {
    if (this.started) {
      return
    }
    this.started = true
    const callback = takeArchonCallback()
    if (!this.auth.isAuthenticated()) {
      this.message.set('session_changed')
      return
    }
    if (!callback?.state || (!callback.code && !callback.error)) {
      this.message.set('invalid_attempt')
      return
    }
    const cancelled = Boolean(callback.error)
    this.busy.set(true)
    this.api
      .completeArchon(callback)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (status) => {
          this.busy.set(false)
          this.successful.set(status.linked && !cancelled)
          this.message.set(
            cancelled ? 'cancelled' : status.linked ? 'success' : 'error',
          )
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false)
          this.message.set(archonErrorKey(error))
        },
      })
  }
}
