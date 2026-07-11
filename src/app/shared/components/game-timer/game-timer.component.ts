import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { GameTimerStore } from '@state/game-timer/game-timer.store'

const ALMOST_UP_THRESHOLD_MS = 5 * 60 * 1000
const MIN_DURATION_MINUTES = 1
const MAX_DURATION_MINUTES = 600
// Reset requires holding the button down this long, to avoid accidental resets
const RESET_HOLD_MS = 2000

@Component({
  selector: 'app-game-timer',
  templateUrl: './game-timer.component.html',
  styleUrls: ['./game-timer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class GameTimerComponent {
  activeModal = inject(NgbActiveModal)
  private readonly store = inject(GameTimerStore)
  private readonly destroyRef = inject(DestroyRef)

  readonly presets = [30, 120]
  readonly resetHoldMs = RESET_HOLD_MS

  private readonly now = signal(Date.now())
  private readonly holdingReset = signal(false)
  private resetHoldTimeoutId?: ReturnType<typeof setTimeout>
  private wakeLock?: WakeLockSentinel

  readonly state = this.store.state$
  readonly status = computed(() => this.state().status)
  readonly hasEdge = computed(() => this.state().hasEdge)
  readonly resetHolding = this.holdingReset.asReadonly()
  readonly durationMinutes = computed(() =>
    Math.round(this.state().durationMs / 60000),
  )
  readonly remainingMs = computed(() => {
    const state = this.state()
    switch (state.status) {
      case 'running':
        return Math.max(0, (state.endEpochMs ?? 0) - this.now())
      case 'paused':
        return state.remainingMs ?? state.durationMs
      case 'finished':
        return 0
      default:
        return state.durationMs
    }
  })
  readonly display = computed(() => this.formatTime(this.remainingMs()))
  readonly finished = computed(() => this.status() === 'finished')
  readonly almostUp = computed(
    () =>
      (this.status() === 'running' || this.status() === 'paused') &&
      this.remainingMs() <= ALMOST_UP_THRESHOLD_MS,
  )

  constructor() {
    const intervalId = setInterval(() => {
      if (this.status() === 'running') {
        this.now.set(Date.now())
      }
    }, 250)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        this.now.set(Date.now())
        if (this.status() === 'running') {
          this.requestWakeLock()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    this.destroyRef.onDestroy(() => {
      clearInterval(intervalId)
      clearTimeout(this.resetHoldTimeoutId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      this.releaseWakeLock()
    })

    effect(() => {
      if (this.status() === 'running' && this.remainingMs() <= 0) {
        this.store.finish()
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200])
        }
      }
    })

    effect(() => {
      if (this.status() === 'running') {
        this.requestWakeLock()
      } else {
        this.releaseWakeLock()
      }
    })
  }

  onPrimaryAction(): void {
    this.cancelResetHold()
    switch (this.status()) {
      case 'idle':
      case 'paused':
        this.now.set(Date.now())
        this.store.start()
        break
      case 'running':
        this.store.pause()
        break
      case 'finished':
        this.store.reset()
        break
    }
  }

  onResetHoldStart(): void {
    if (this.holdingReset()) {
      return
    }
    this.holdingReset.set(true)
    this.resetHoldTimeoutId = setTimeout(() => {
      this.holdingReset.set(false)
      this.store.reset()
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }, RESET_HOLD_MS)
  }

  onResetHoldEnd(): void {
    this.cancelResetHold()
  }

  onToggleEdge(): void {
    this.store.toggleEdge()
  }

  onSelectPreset(minutes: number): void {
    this.store.setDuration(minutes * 60000)
  }

  onCustomMinutes(event: Event): void {
    const input = event.target as HTMLInputElement
    const minutes = Math.min(
      MAX_DURATION_MINUTES,
      Math.max(MIN_DURATION_MINUTES, Math.floor(Number(input.value))),
    )
    if (Number.isNaN(minutes)) {
      input.value = String(this.durationMinutes())
      return
    }
    input.value = String(minutes)
    this.store.setDuration(minutes * 60000)
  }

  private cancelResetHold(): void {
    clearTimeout(this.resetHoldTimeoutId)
    this.holdingReset.set(false)
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
  }

  private requestWakeLock(): void {
    if (!('wakeLock' in navigator)) {
      return
    }
    navigator.wakeLock
      .request('screen')
      .then((sentinel) => (this.wakeLock = sentinel))
      .catch(() => {
        // Wake lock is a nice-to-have; ignore rejections (e.g. low battery)
      })
  }

  private releaseWakeLock(): void {
    this.wakeLock?.release().catch(() => undefined)
    this.wakeLock = undefined
  }
}
