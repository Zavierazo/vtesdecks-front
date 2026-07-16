import { TestBed } from '@angular/core/testing'
import { Router, UrlTree } from '@angular/router'
import { provideRouter } from '@angular/router'
import { AuthStore } from '@state/auth/auth.store'
import { describe, expect, it } from 'vitest'
import { CanActivateAdmin } from './can-activate-admin.guard'

describe('CanActivateAdmin', () => {
  function setup(admin: boolean | undefined) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] })
    const authStore = TestBed.inject(AuthStore)
    authStore.update({ ...authStore.getValue(), admin })
    return TestBed.inject(CanActivateAdmin)
  }

  it('allows activation for admins', () => {
    const guard = setup(true)
    expect(guard.canActivate()).toBe(true)
  })

  it('redirects home for non-admins', () => {
    const guard = setup(false)
    const result = guard.canActivate()
    expect(result).toBeInstanceOf(UrlTree)
    expect(result.toString()).toBe(
      TestBed.inject(Router).parseUrl('/').toString(),
    )
  })

  it('redirects home for anonymous users', () => {
    const guard = setup(undefined)
    expect(guard.canActivate()).toBeInstanceOf(UrlTree)
  })
})
