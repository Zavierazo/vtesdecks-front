import { Injectable, inject } from '@angular/core'
import { ApiUser } from '@models'
import { Observable } from 'rxjs'
import { AuthStore } from './auth.store'

@Injectable({
  providedIn: 'root',
})
export class AuthQuery {
  private readonly store = inject(AuthStore)

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectAuthenticated(): Observable<boolean> {
    return this.store.select((user: ApiUser) => !!user.token)
  }

  selectSupporter(): Observable<boolean> {
    return this.store.select((user: ApiUser) =>
      user.roles?.includes('supporter'),
    )
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

  selectBuilderDisplayMode(): Observable<'list' | 'grid'> {
    return this.store.select((state) => state.builderDisplayMode || 'list')
  }

  selectCardsDisplayMode(): Observable<'list' | 'grid'> {
    return this.store.select((state) => state.cardsDisplayMode || 'list')
  }

  selectDeckDisplayMode(): Observable<'list' | 'grid'> {
    return this.store.select((state) => state.deckDisplayMode || 'list')
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

  getBuilderDisplayMode(): 'list' | 'grid' {
    return this.store.getValue().builderDisplayMode
  }

  getCardsDisplayMode(): 'list' | 'grid' {
    return this.store.getValue().cardsDisplayMode
  }

  getDeckDisplayMode(): 'list' | 'grid' {
    return this.store.getValue().deckDisplayMode
  }

  isSupporter(): boolean {
    return this.store.getValue().roles?.includes('supporter') ?? false
  }
}
