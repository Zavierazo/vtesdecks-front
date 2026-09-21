import { TestBed } from '@angular/core/testing'
import { JwtHelperService } from '@auth0/angular-jwt'
import { ApiDataService } from '@services'
import { of, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from './auth.service'
import { AuthStore } from './auth.store'

describe('password change credentials', () => {
  afterEach(() => TestBed.resetTestingModule())

  it('stores replacement credentials through refreshToken, preserving remember-me storage', () => {
    const authenticatedUser = { user: 'alice', token: 'replacement' }
    const api = {
      updateSettings: vi.fn(() => of({ successful: true, authenticatedUser })),
      userRefresh: vi.fn(),
    }
    const store = { refreshToken: vi.fn() }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: AuthStore, useValue: store },
        { provide: JwtHelperService, useValue: {} },
      ],
    })
    TestBed.inject(AuthService)
      .updateSettings({
        displayName: 'Alice',
        password: 'old',
        newPassword: 'new-password1',
      })
      .subscribe()
    expect(store.refreshToken).toHaveBeenCalledExactlyOnceWith(
      authenticatedUser,
    )
    expect(api.userRefresh).not.toHaveBeenCalled()
  })
})

describe('offline session refresh', () => {
  it.each([0, 503, 401, 403])(
    'handles refresh status %s without treating network failure as logout',
    (status) => {
      const store = {
        getValue: () => ({ token: 'valid' }),
        reset: vi.fn(),
        setLoading: vi.fn(),
        setError: vi.fn(),
      }
      TestBed.configureTestingModule({
        providers: [
          {
            provide: ApiDataService,
            useValue: { userRefresh: () => throwError(() => ({ status })) },
          },
          { provide: AuthStore, useValue: store },
          {
            provide: JwtHelperService,
            useValue: { isTokenExpired: () => false },
          },
        ],
      })
      TestBed.inject(AuthService).refreshToken().subscribe()
      expect(store.reset).toHaveBeenCalledTimes(
        status === 401 || status === 403 ? 1 : 0,
      )
    },
  )
})

describe('country lookup readiness', () => {
  it.each([false, true])(
    'marks lookup complete on success or failure (failure: %s)',
    (failed) => {
      const store = { setCountryLoaded: vi.fn(), updateCountryCode: vi.fn() }
      TestBed.configureTestingModule({
        providers: [
          { provide: AuthStore, useValue: store },
          { provide: JwtHelperService, useValue: {} },
          {
            provide: ApiDataService,
            useValue: {
              getUserCountry: () =>
                failed
                  ? throwError(() => new Error('offline'))
                  : of({ countryCode: 'es' }),
            },
          },
        ],
      })
      TestBed.inject(AuthService).loadCountry().subscribe()
      expect(store.setCountryLoaded.mock.calls).toEqual([[false], [true]])
      expect(store.updateCountryCode).toHaveBeenCalledWith(
        failed ? undefined : 'ES',
      )
    },
  )
})
