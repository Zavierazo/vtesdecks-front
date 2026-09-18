import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TranslocoPipe } from '@jsverse/transloco'
import { ConnectivityService } from '../../../services/connectivity.service'

@Component({
  selector: 'app-connectivity-banner',
  templateUrl: './connectivity-banner.component.html',
  styleUrls: ['./connectivity-banner.component.scss'],
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectivityBannerComponent {
  readonly connection = inject(ConnectivityService)
  readonly reconnected = signal(false)
  private wasOffline = this.connection.offline()
  private timeout?: ReturnType<typeof setTimeout>

  constructor() {
    const destroyRef = inject(DestroyRef)
    destroyRef.onDestroy(() => clearTimeout(this.timeout))
    this.connection.changed.pipe(takeUntilDestroyed()).subscribe(() => {
      const offline = this.connection.offline()
      if (offline) {
        clearTimeout(this.timeout)
        this.reconnected.set(false)
      } else if (this.wasOffline) {
        this.reconnected.set(true)
        clearTimeout(this.timeout)
        this.timeout = setTimeout(() => this.reconnected.set(false), 1800)
      }
      this.wasOffline = offline
    })
  }
}
