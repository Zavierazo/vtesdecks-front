import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiUser } from '../../models/api-user'
import { AuthStore } from './auth.store'

@Injectable({
  providedIn: 'root',
})
export class AuthQuery {
  constructor(private readonly store: AuthStore) {}

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectAuthenticated(): Observable<boolean> {
    return this.store.select((user: ApiUser) => !!user.token)
  }

  selectAdmin(): Observable<boolean> {
    return this.store.select((user: ApiUser) => Boolean(user.admin))
  }

  selectDisplayName(): Observable<string | undefined> {
    return this.store.select((user: ApiUser) => user.displayName)
  }

  selectProfileImage(): Observable<string | undefined> {
    return this.store.select((user: ApiUser) => user.profileImage)
  }

  selectNotificationCount(): Observable<number | undefined> {
    return this.store.select((user: ApiUser) => user.notificationCount)
  }

  selectEmail(): Observable<string | undefined> {
    return this.store.select((user: ApiUser) => user.email)
  }

  isAuthenticated(): boolean {
    return !!this.store.getValue().token
  }

  getUser(): string | undefined {
    return this.store.getValue().user
  }

  getToken(): string | undefined {
    return this.store.getValue().token
  }

  getDisplayName(): string | undefined {
    return this.store.getValue().displayName
  }

  getEmail(): string | undefined {
    return this.store.getValue().email
  }
}
