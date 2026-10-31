import { HttpErrorResponse } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { finalize } from 'rxjs'
import { ApiArchonStatus } from '../../../models/api-archon'
import { ConnectivityService } from '../../../services/connectivity.service'
import { archonErrorKey } from '../../../utils/archon-callback'

@UntilDestroy()
@Component({
  imports: [TranslocoDirective],
  selector: 'app-archon-settings',
  templateUrl: './archon-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchonSettingsComponent implements OnInit {
  private readonly api = inject(ApiDataService)
  readonly connectivity = inject(ConnectivityService)
  readonly status = signal<ApiArchonStatus | undefined>(undefined)
  readonly busy = signal(false)
  readonly error = signal('')

  ngOnInit(): void {
    this.load()
  }

  load(): void {
    if (this.busy()) {
      return
    }
    this.busy.set(true)
    this.error.set('')
    this.api
      .getArchonStatus()
      .pipe(
        untilDestroyed(this),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (status) => this.status.set(status),
        error: (error: HttpErrorResponse) =>
          this.error.set(archonErrorKey(error)),
      })
  }

  connect(): void {
    if (
      this.busy() ||
      this.connectivity.offline() ||
      !this.status()?.available ||
      this.status()?.linked
    ) {
      return
    }
    this.busy.set(true)
    this.error.set('')
    this.api
      .connectArchon()
      .pipe(
        untilDestroyed(this),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: ({ authorizationUrl }) => {
          try {
            const url = new URL(authorizationUrl)
            if (
              url.origin === 'https://archon.vekn.net' &&
              url.pathname === '/consent' &&
              !url.username &&
              !url.password
            ) {
              window.location.assign(url.href)
            } else {
              this.error.set('error')
            }
          } catch {
            this.error.set('error')
          }
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(archonErrorKey(error)),
      })
  }

  disconnect(): void {
    if (this.busy() || this.connectivity.offline() || !this.status()?.linked) {
      return
    }
    this.busy.set(true)
    this.error.set('')
    this.api
      .disconnectArchon()
      .pipe(
        untilDestroyed(this),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () =>
          this.status.update((status) =>
            status ? { ...status, linked: false, veknId: null } : status,
          ),
        error: (error: HttpErrorResponse) =>
          this.error.set(archonErrorKey(error)),
      })
  }
}
