import { Observable } from 'rxjs'
import { Injectable } from '@angular/core'
import { Query } from '@datorama/akita'
import { ApiUser } from '../../models/api-user'
import { AuthStore } from './auth.store'

@Injectable({
  providedIn: 'root',
})
export class AuthQuery extends Query<ApiUser> {
  constructor(protected override store: AuthStore) {
    super(store)
  }

  selectAuthenticated(): Observable<boolean> {
    return this.select((user: ApiUser) => !!user.token)
  }

  selectToken(): Observable<string | undefined> {
    return this.select((user: ApiUser) => user.token)
  }

  selectAdmin(): Observable<boolean> {
    return this.select((user: ApiUser) => Boolean(user.admin))
  }

  selectDisplayName(): Observable<string | undefined> {
    return this.select((user: ApiUser) => user.displayName)
  }

  selectProfileImage(): Observable<string | undefined> {
    return this.select((user: ApiUser) => user.profileImage)
  }

  selectNotificationCount(): Observable<number | undefined> {
    return this.select((user: ApiUser) => user.notificationCount)
  }

  selectEmail(): Observable<string | undefined> {
    return this.select((user: ApiUser) => user.email)
  }

  isAuthenticated(): boolean {
    return !!this.getValue().token
  }

  getToken(): string | undefined {
    return this.getValue().token
  }

  getDisplayName(): string | undefined {
    return this.getValue().displayName
  }

  getProfileImage(): string | undefined {
    return this.getValue().profileImage
  }

  getAdmin(): boolean | undefined {
    return this.getValue().admin
  }

  getEmail(): string | undefined {
    return this.getValue().email
  }
}
