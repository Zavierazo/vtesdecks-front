import { Injectable } from '@angular/core'
import { Store, StoreConfig } from '@datorama/akita'
import { ApiUser } from '../../models/api-user'
import { LocalStorageService } from '../../services/local-storage.service'
import { SessionStorageService } from '../../services/session-storage.service'
import { NgcCookieConsentService } from 'ngx-cookieconsent'

const initialState: ApiUser = {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: AuthStore.storeName })
export class AuthStore extends Store<ApiUser> {
  static readonly storeName = 'auth'

  constructor(
    private localStorage: LocalStorageService,
    private sessionStorage: SessionStorageService,
    private cookieConsentService: NgcCookieConsentService,
  ) {
    super(initialState)
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
}
