import { Injectable, signal } from '@angular/core'
import { Subject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  readonly offline = signal(!navigator.onLine)
  readonly serverUnavailable = signal(false)
  readonly resumed = new Subject<void>()
  readonly changed = new Subject<void>()

  constructor() {
    window.addEventListener('offline', () => {
      this.offline.set(true)
      this.changed.next()
    })
    window.addEventListener('online', () => this.resume())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        this.resume()
      }
    })
  }

  private resume() {
    this.offline.set(false)
    this.changed.next()
    this.resumed.next()
  }

  success() {
    this.serverUnavailable.set(false)
  }

  failure(status: number) {
    if (!navigator.onLine) {
      this.offline.set(true)
      this.changed.next()
    } else if (status === 0 || status >= 500) {
      // A failed request alone cannot establish that the device has no network.
      this.serverUnavailable.set(true)
    }
  }
}
