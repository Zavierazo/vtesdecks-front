import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiAdminUser } from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, ToastService } from '@services'
import { of, throwError } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminUserSettingsComponent } from './admin-user-settings.component'

describe('AdminUserSettingsComponent', () => {
  afterEach(() => TestBed.resetTestingModule())

  const managedUser: ApiAdminUser = {
    user: 'target',
    displayName: 'Target User',
    profileImage: '',
    email: 'target@example.com',
    validated: false,
    admin: false,
    roles: ['supporter'],
    availableRoles: ['supporter', 'tester'],
  }

  function setup(overrides: Record<string, unknown> = {}) {
    const api = {
      getAdminUser: vi.fn(() => of(managedUser)),
      updateAdminUserAccess: vi.fn(() =>
        of({ ...managedUser, admin: true, roles: ['supporter', 'tester'] }),
      ),
      validateAdminUser: vi.fn(() => of({ ...managedUser, validated: true })),
      sendAdminUserPasswordReset: vi.fn(() => of(undefined)),
      ...overrides,
    }
    const toast = { show: vi.fn() }
    const modal = {
      open: vi.fn(() => ({ componentInstance: {}, closed: of(true) })),
    }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: NgbModal, useValue: modal },
        { provide: NgbActiveModal, useValue: { dismiss: vi.fn() } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new AdminUserSettingsComponent(),
    )
    component.identifier = 'target'
    return { component, api, toast, modal }
  }

  it('does not fetch private data until the modal component initializes', () => {
    const { component, api } = setup()

    expect(api.getAdminUser).not.toHaveBeenCalled()
    component.ngOnInit()

    expect(api.getAdminUser).toHaveBeenCalledWith('target')
    expect(component.user()).toEqual(managedUser)
  })

  it('shows a specific not-found state for an unknown username or email', () => {
    const { component } = setup({
      getAdminUser: vi.fn(() =>
        throwError(() => new HttpErrorResponse({ status: 404 })),
      ),
    })

    component.ngOnInit()

    expect(component.loadError()).toBe('not-found')
    expect(component.user()).toBeUndefined()
  })

  it('saves the full administrator and role draft after confirmation', () => {
    const { component, api } = setup()
    const emitted = vi.fn()
    component.rolesChanged.subscribe(emitted)
    component.ngOnInit()
    component.toggleAdmin({ target: { checked: true } } as unknown as Event)
    component.toggleRole('tester', {
      target: { checked: true },
    } as unknown as Event)

    component.save()

    expect(api.updateAdminUserAccess).toHaveBeenCalledWith('target', {
      admin: true,
      roles: ['supporter', 'tester'],
    })
    expect(emitted).toHaveBeenCalledWith(['supporter', 'tester'])
    expect(component.dirty()).toBe(false)
  })

  it('validates the account after confirmation', () => {
    const { component, api } = setup()
    component.ngOnInit()

    component.validateAccount()

    expect(api.validateAdminUser).toHaveBeenCalledWith('target')
    expect(component.user()?.validated).toBe(true)
  })

  it('saves role-only changes without opening a confirmation', () => {
    const { component, api, modal } = setup()
    component.ngOnInit()
    component.toggleRole('tester', {
      target: { checked: true },
    } as unknown as Event)

    component.save()

    expect(modal.open).not.toHaveBeenCalled()
    expect(api.updateAdminUserAccess).toHaveBeenCalledWith('target', {
      admin: false,
      roles: ['supporter', 'tester'],
    })
  })

  it('shows cooldown feedback for a rate-limited password reset', () => {
    const { component, toast } = setup({
      sendAdminUserPasswordReset: vi.fn(() =>
        throwError(() => new HttpErrorResponse({ status: 429 })),
      ),
    })
    component.ngOnInit()

    component.sendPasswordReset()

    expect(toast.show).toHaveBeenCalledWith(
      'admin_user.password_reset_cooldown',
      expect.objectContaining({ classname: 'bg-danger text-light' }),
    )
  })
})
