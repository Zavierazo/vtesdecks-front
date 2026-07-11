import { inject, Injectable, signal } from '@angular/core'
import { LocalStorageService, SessionStorageService } from '@services'
import { NgcCookieConsentService } from 'ngx-cookieconsent'

export type GameTimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface GameTimerState {
  durationMs: number
  status: GameTimerStatus
  // Wall-clock deadline, only set while running
  endEpochMs?: number
  // Frozen remainder, only set while paused or finished
  remainingMs?: number
  hasEdge: boolean
}

export const GAME_TIMER_DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

const DEFAULT_STATE: GameTimerState = {
  durationMs: GAME_TIMER_DEFAULT_DURATION_MS,
  status: 'idle',
  hasEdge: false,
}

@Injectable({
  providedIn: 'root',
})
export class GameTimerStore {
  private readonly localStorage = inject(LocalStorageService)
  private readonly sessionStorage = inject(SessionStorageService)
  private readonly cookieConsentService = inject(NgcCookieConsentService)

  static readonly stateStoreName = 'game_timer_v1_state'

  private readonly state = signal<GameTimerState>(DEFAULT_STATE)
  readonly state$ = this.state.asReadonly()

  constructor() {
    const previousState =
      this.localStorage.getValue<GameTimerState>(
        GameTimerStore.stateStoreName,
      ) ??
      this.sessionStorage.getValue<GameTimerState>(
        GameTimerStore.stateStoreName,
      )
    if (previousState) {
      this.state.set(this.rehydrate(previousState))
    }
  }

  setDuration(durationMs: number) {
    if (this.state().status !== 'idle') {
      return
    }
    this.state.update((state) => ({ ...state, durationMs }))
    this.updateStorage()
  }

  start() {
    const { status, durationMs, remainingMs } = this.state()
    if (status === 'running' || status === 'finished') {
      return
    }
    this.state.update((state) => ({
      ...state,
      status: 'running',
      endEpochMs: Date.now() + (remainingMs ?? durationMs),
      remainingMs: undefined,
    }))
    this.updateStorage()
  }

  pause() {
    const { status, endEpochMs } = this.state()
    if (status !== 'running' || endEpochMs === undefined) {
      return
    }
    this.state.update((state) => ({
      ...state,
      status: 'paused',
      remainingMs: Math.max(0, endEpochMs - Date.now()),
      endEpochMs: undefined,
    }))
    this.updateStorage()
  }

  finish() {
    this.state.update((state) => ({
      ...state,
      status: 'finished',
      endEpochMs: undefined,
      remainingMs: 0,
    }))
    this.updateStorage()
  }

  reset() {
    this.state.update((state) => ({
      ...state,
      status: 'idle',
      endEpochMs: undefined,
      remainingMs: undefined,
    }))
    this.updateStorage()
  }

  toggleEdge() {
    this.state.update((state) => ({ ...state, hasEdge: !state.hasEdge }))
    this.updateStorage()
  }

  private rehydrate(state: GameTimerState): GameTimerState {
    if (state.status === 'running') {
      if (state.endEpochMs === undefined) {
        // Corrupt state guard
        return {
          ...DEFAULT_STATE,
          durationMs: state.durationMs,
          hasEdge: state.hasEdge,
        }
      }
      if (state.endEpochMs <= Date.now()) {
        // Timer expired while the page was closed
        return {
          ...state,
          status: 'finished',
          endEpochMs: undefined,
          remainingMs: 0,
        }
      }
    }
    return state
  }

  private updateStorage(): void {
    const state = this.state()
    if (this.cookieConsentService.hasConsented()) {
      this.localStorage.setValue(GameTimerStore.stateStoreName, state)
    } else {
      this.localStorage.clearValue(GameTimerStore.stateStoreName)
      this.sessionStorage.setValue(GameTimerStore.stateStoreName, state)
    }
  }
}
