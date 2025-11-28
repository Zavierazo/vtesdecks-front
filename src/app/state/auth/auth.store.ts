import { inject, Injectable, Signal, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiUser } from '@models'
import { LocalStorageService, SessionStorageService } from '@services'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { map, Observable } from 'rxjs'

export interface AuthState extends ApiUser {
  builderDisplayMode: 'list' | 'grid'
  cardsDisplayMode: 'list' | 'grid'
  deckDisplayMode: 'list' | 'grid'
}

const initialState: AuthState = {
  builderDisplayMode: 'list',
  cardsDisplayMode: 'list',
  deckDisplayMode: 'list',
}

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly localStorage = inject(LocalStorageService)
  private readonly sessionStorage = inject(SessionStorageService)
  private readonly cookieConsentService = inject(NgcCookieConsentService)

  static readonly storeName = 'auth'
  private readonly serverDate = signal<Date | undefined>(undefined)
  private readonly state = signal<AuthState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)
  private readonly error = signal<string | null | undefined>(null)
  private readonly error$ = toObservable(this.error)

  constructor() {
    const previousState = this.sessionStorage.getValue<AuthState>(
      AuthStore.storeName,
    )
    if (previousState) {
      this.update(previousState)
    }
    const previousLocalState = this.localStorage.getValue<AuthState>(
      AuthStore.storeName,
    )
    if (previousLocalState) {
      this.update(previousLocalState)
    }
  }

  updateToken(response: ApiUser, remember: boolean) {
    const { token } = response
    this.update({ ...this.getValue(), ...response, token })
    const useLocalStorage =
      Boolean(remember) && this.cookieConsentService.hasConsented()
    this.updateStorage(useLocalStorage)
  }

  refreshToken(response: ApiUser) {
    this.update({ ...this.getValue(), ...response })
    this.updateStorage()
  }

  updateNotificationCount(notificationCount: number) {
    this.update({ ...this.getValue(), notificationCount })
    this.updateStorage()
  }

  updateDisplayName(displayName: string) {
    this.update({ ...this.getValue(), displayName })
    this.updateStorage()
  }

  updateBuilderDisplayMode(builderDisplayMode: 'list' | 'grid') {
    this.update({ ...this.getValue(), builderDisplayMode })
    this.updateStorage()
  }

  updateCardsDisplayMode(cardsDisplayMode: 'list' | 'grid') {
    this.update({ ...this.getValue(), cardsDisplayMode })
    this.updateStorage()
  }

  updateDeckDisplayMode(deckDisplayMode: 'list' | 'grid') {
    this.update({ ...this.getValue(), deckDisplayMode })
    this.updateStorage()
  }

  updateServerDate(serverDate: Date) {
    this.serverDate.set(serverDate)
  }

  private updateStorage(useLocalStorage?: boolean): void {
    if (
      useLocalStorage ||
      this.localStorage.getValue(AuthStore.storeName) != null
    ) {
      this.localStorage.setValue(AuthStore.storeName, this.getValue())
    }
    this.sessionStorage.setValue(AuthStore.storeName, this.getValue())
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: AuthState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  selectServerDate(): Signal<Date | undefined> {
    return this.serverDate
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  getValue(): AuthState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  getError(): string | null | undefined {
    return this.error()
  }

  update(value: AuthState) {
    this.state.update(() => value)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  setError(value: string | null | undefined) {
    this.error.update(() => value)
  }
}
