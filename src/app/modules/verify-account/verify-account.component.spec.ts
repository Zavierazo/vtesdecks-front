import { TestBed } from '@angular/core/testing'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VerifyAccountComponent } from './verify-account.component'

describe('email verification', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    TestBed.resetTestingModule()
  })

  it('verifies automatically on initialization and submits the email token once', () => {
    const token = 'a'.repeat(43)
    window.history.replaceState(null, '', `/verify#token=${token}`)
    const api = { verifyAccount: vi.fn(() => of({ successful: true })) }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: NgbModal, useValue: { open: vi.fn() } },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new VerifyAccountComponent(),
    )
    expect(api.verifyAccount).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    component.ngOnInit()
    component.verify()
    expect(api.verifyAccount).toHaveBeenCalledExactlyOnceWith(token)
    expect(component.complete()).toBe(true)
  })
})
