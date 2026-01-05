import { inject, Injectable } from '@angular/core'
import { BehaviorSubject, Observable, of } from 'rxjs'
import { catchError, map, tap } from 'rxjs/operators'
import { ApiDataService } from './api.data.service'

@Injectable({
  providedIn: 'root',
})
export class UserFollowService {
  private readonly apiDataService = inject(ApiDataService)
  private readonly followingUsersSubject = new BehaviorSubject<Set<string>>(
    new Set(),
  )

  /**
   * Check if the current user is following a specific user
   */
  isFollowing(user: string): Observable<boolean> {
    return this.followingUsersSubject
      .asObservable()
      .pipe(map((followingUsers) => followingUsers.has(user)))
  }

  /**
   * Check if the current user is following a specific user
   */
  getFollowing(user: string): boolean {
    return this.followingUsersSubject.value.has(user)
  }

  /**
   * Check if the current user is following a specific user by loading their follow status
   */
  loadFollowingUser(user: string): Observable<boolean> {
    if (this.followingUsersSubject.value.has(user)) {
      return of(true)
    }
    return this.apiDataService.isUserFollowing(user).pipe(
      tap((isFollowing) => {
        const currentFollowing = this.followingUsersSubject.value
        if (isFollowing) {
          currentFollowing.add(user)
        } else {
          currentFollowing.delete(user)
        }
        this.followingUsersSubject.next(new Set(currentFollowing))
      }),
      catchError(() => {
        return of(false)
      }),
    )
  }

  /**
   * Follow or unfollow a user
   */
  toggleFollow(user: string, follow: boolean): Observable<boolean> {
    return this.apiDataService.userFollow(user, follow).pipe(
      tap((success) => {
        if (success) {
          const currentFollowing = this.followingUsersSubject.value
          if (follow) {
            currentFollowing.add(user)
          } else {
            currentFollowing.delete(user)
          }
          this.followingUsersSubject.next(new Set(currentFollowing))
        }
      }),
      catchError(() => {
        return of(false)
      }),
    )
  }

  /**
   * Clear the following users cache
   */
  clearCache(): void {
    this.followingUsersSubject.next(new Set())
  }
}
