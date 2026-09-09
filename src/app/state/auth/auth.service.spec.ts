import { TestBed } from '@angular/core/testing'
import { JwtHelperService } from '@auth0/angular-jwt'
import { ApiDataService } from '@services'
import { of } from 'rxjs'
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
