import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { map, Observable } from 'rxjs'
import { ApiUser } from '../../models/api-user'
import { LocalStorageService } from '../../services/local-storage.service'
import { SessionStorageService } from '../../services/session-storage.service'

const initialState: ApiUser = {}

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  static readonly storeName = 'auth'
  private readonly state = signal<ApiUser>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)
  private readonly error = signal<string | null | undefined>(null)
  private readonly error$ = toObservable(this.error)

  constructor(
    private localStorage: LocalStorageService,
    private sessionStorage: SessionStorageService,
    private cookieConsentService: NgcCookieConsentService,
  ) {
    const previousState = this.sessionStorage.getValue<ApiUser>(
      AuthStore.storeName,
    )
    if (previousState) {
      this.update(previousState)
    }
    const previousLocalState = this.localStorage.getValue<ApiUser>(
      AuthStore.storeName,
    )
    if (previousLocalState) {
      this.update(previousLocalState)
    }
  }

  updateToken(response: ApiUser, remember: boolean) {
    const { token } = response
    this.update({ ...response, token })
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

  private updateStorage(useLocalStorage?: boolean): void {
    if (
      useLocalStorage ||
      this.localStorage.getValue(AuthStore.storeName) != null
    ) {
      this.localStorage.setValue(AuthStore.storeName, this.getValue())
    }
    this.sessionStorage.setValue(AuthStore.storeName, this.getValue())
  }

  select(selector: (state: ApiUser) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  getValue(): ApiUser {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  getError(): string | null | undefined {
    return this.error()
  }

  update(value: ApiUser) {
    this.state.update(() => value)
  }

  setLoading(value: boolean = false) {
    this.loading.update(() => value)
  }

  setError(value: string | null | undefined) {
    this.error.update(() => value)
  }
}
