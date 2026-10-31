import { HttpErrorResponse } from '@angular/common/http'
import { OnDestroy } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ApiDataService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { of, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArchonCallbackComponent } from './archon-callback.component'

describe('Archon callback', () => {
  const complete = vi.fn()
  const authenticated = vi.fn()
  let component: ArchonCallbackComponent
  beforeEach(() => {
    complete.mockReset().mockReturnValue(of({ linked: true }))
    authenticated.mockReset().mockReturnValue(true)
    window.__archonCallback = { code: 'one-use-code', state: 'state' }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: { completeArchon: complete } },
        { provide: AuthQuery, useValue: { isAuthenticated: authenticated } },
      ],
    })
    component = TestBed.runInInjectionContext(
      () => new ArchonCallbackComponent(),
    )
  })
  afterEach(() => {
    ;(component as unknown as OnDestroy).ngOnDestroy()
    delete window.__archonCallback
  })

  it('consumes the in-memory callback and submits it once', () => {
    component.ngOnInit()
    component.ngOnInit()
    expect(complete).toHaveBeenCalledExactlyOnceWith({
      code: 'one-use-code',
      state: 'state',
    })
    expect(window.__archonCallback).toBeUndefined()
    expect(component.successful()).toBe(true)
    expect(component.message()).toBe('success')
  })

  it('discards credentials when the website session is missing', () => {
    authenticated.mockReturnValue(false)
    component.ngOnInit()
    expect(window.__archonCallback).toBeUndefined()
    expect(complete).not.toHaveBeenCalled()
    expect(component.message()).toBe('session_changed')
  })

  it('never replays a failed exchange', () => {
    complete.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    )
    component.ngOnInit()
    component.ngOnInit()
    expect(complete).toHaveBeenCalledTimes(1)
    expect(component.message()).toBe('error')
    expect(component.busy()).toBe(false)
  })

  it('consumes denials through the backend and reports cancellation', () => {
    window.__archonCallback = { error: 'access_denied', state: 'state' }
    complete.mockReturnValue(of({ linked: false }))
    component.ngOnInit()
    expect(complete).toHaveBeenCalledExactlyOnceWith({
      error: 'access_denied',
      state: 'state',
    })
    expect(component.message()).toBe('cancelled')
  })

  it('cannot resume a callback after reload', () => {
    delete window.__archonCallback
    component.ngOnInit()
    expect(component.message()).toBe('invalid_attempt')
    expect(complete).not.toHaveBeenCalled()
  })
})
