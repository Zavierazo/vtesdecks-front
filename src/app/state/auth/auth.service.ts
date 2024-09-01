import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { ApiUser } from '../../models/api-user';
import { ApiUserSettings } from '../../models/api-user-settings';
import { ApiDataService } from '../../services/api.data.service';
import { AuthStore } from './auth.store';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private authStore: AuthStore,
    private apiDataService: ApiDataService,
    private jwtHelper: JwtHelperService
  ) {}

  readNotification(all?: boolean): void {
    const notificationCount = this.authStore.getValue().notificationCount;
    if (notificationCount) {
      this.authStore.updateNotificationCount(all ? 0 : notificationCount - 1);
    }
  }

  generateToken(
    username: string,
    password: string,
    remember: boolean,
    recaptcha: string
  ): Observable<ApiUser> {
    this.authStore.setLoading(true);
    return this.apiDataService.login(username, password, recaptcha).pipe(
      tap((response: ApiUser) => {
        this.authStore.setLoading();
        if (response.message) {
          this.authStore.setError(response.message);
        } else {
          this.authStore.updateToken(response, remember);
        }
      })
    );
  }

  register(
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
    recaptcha: string
  ): Observable<ApiResponse> {
    this.authStore.setLoading(true);
    return this.apiDataService
      .register(username, email, password, confirmPassword, recaptcha)
      .pipe(
        tap((response: ApiResponse) => {
          this.authStore.setLoading();
          if (response.message) {
            this.authStore.setError(response.message);
          }
        })
      );
  }

  forgotPassword(email: string, recaptcha: string): Observable<ApiResponse> {
    this.authStore.setLoading(true);
    return this.apiDataService.forgotPassword(email, recaptcha).pipe(
      tap((response: ApiResponse) => {
        this.authStore.setLoading();
        if (response.message) {
          this.authStore.setError(response.message);
        }
      })
    );
  }

  logout(): void {
    this.authStore.updateToken({} as ApiUser, false);
    this.authStore.setLoading();
    this.clearErrors();
  }

  clearErrors(): void {
    this.authStore.setError(undefined);
  }

  refreshToken(): Observable<boolean> {
    if (!this.jwtHelper.isTokenExpired() && this.authStore.getValue().token) {
      return this.apiDataService.userRefresh().pipe(
        tap((response: ApiUser) => this.authStore.refreshToken(response)),
        switchMap(() => of(true)),
        catchError(() => {
          this.logout();
          return of(false);
        })
      );
    } else {
      this.logout();
      return of(false);
    }
  }

  updateSettings(settings: ApiUserSettings): Observable<ApiResponse> {
    return this.apiDataService.updateSettings(settings).pipe(
      tap((response: ApiResponse) => {
        if (response.successful) {
          this.authStore.updateDisplayName(settings.displayName);
        }
      })
    );
  }
}
