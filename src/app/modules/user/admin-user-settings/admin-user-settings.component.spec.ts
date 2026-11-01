import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { ApiAdminUser } from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, ToastService } from '@services'
import { AuthService } from '@state/auth/auth.service'
import { of, Subject, throwError } from 'rxjs'
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
      updateAdminUserEmail: vi.fn(() =>
        of({ ...managedUser, email: 'new@example.com', validated: true }),
      ),
      updateAdminUserPatreonId: vi.fn(
        (_identifier: string, patreonId: string | null) =>
          of({ ...managedUser, patreonId }),
      ),
      updateAdminUserVeknId: vi.fn(
        (_identifier: string, veknId: string | null) =>
          of({ ...managedUser, veknId }),
      ),
      validateAdminUser: vi.fn(() => of({ ...managedUser, validated: true })),
      sendAdminUserPasswordReset: vi.fn(() => of(undefined)),
      ...overrides,
    }
    const toast = { show: vi.fn() }
    const modal = {
      open: vi.fn(() => ({ componentInstance: {}, closed: of(true) })),
    }
    const auth = {
      impersonate: vi.fn(() =>
        of({ user: 'target', token: 'target-token', admin: false }),
      ),
    }
    const activeModal = { dismiss: vi.fn(), close: vi.fn() }
    const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) }
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: NgbModal, useValue: modal },
        { provide: NgbActiveModal, useValue: activeModal },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
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
    return { component, api, toast, modal, auth, activeModal, router }
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

  it('updates and immediately trusts an admin-provided email', () => {
    const { component, api } = setup()
    component.ngOnInit()
    component.updateDraftEmail({
      target: { value: 'new@example.com' },
    } as unknown as Event)

    component.saveEmail()

    expect(api.updateAdminUserEmail).toHaveBeenCalledWith(
      'target',
      'new@example.com',
    )
    expect(component.user()?.email).toBe('new@example.com')
    expect(component.user()?.validated).toBe(true)
  })

  it('saves a Patreon ID while preserving email, role and VEKN drafts', () => {
    const { component, api } = setup()
    component.ngOnInit()
    component.draftEmail.set('unsaved@example.com')
    component.draftVeknId.set('003120065')
    component.toggleRole('tester', {
      target: { checked: true },
    } as unknown as Event)
    component.draftPatreonId.set(' 00123 ')

    component.saveIdentifier('patreonId')

    expect(api.updateAdminUserPatreonId).toHaveBeenCalledWith('target', '00123')
    expect(component.user()?.patreonId).toBe('00123')
    expect(component.identifierDirty('patreonId')).toBe(false)
    expect(component.draftEmail()).toBe('unsaved@example.com')
    expect(component.draftVeknId()).toBe('003120065')
    expect(component.draftRoles().has('tester')).toBe(true)
  })

  it('clears an ID with null without changing supporter', () => {
    const { component, api } = setup({
      getAdminUser: vi.fn(() => of({ ...managedUser, patreonId: '123' })),
    })
    component.ngOnInit()
    component.draftPatreonId.set('')
    component.saveIdentifier('patreonId')
    expect(api.updateAdminUserPatreonId).toHaveBeenCalledWith('target', null)
    expect(component.user()?.roles).toEqual(['supporter'])
  })

  it('validates IDs before saving and keeps a conflicting draft for correction', () => {
    const { component, api, toast } = setup({
      updateAdminUserPatreonId: vi.fn(() =>
        throwError(() => new HttpErrorResponse({ status: 409 })),
      ),
    })
    component.ngOnInit()
    component.draftPatreonId.set('invalid')
    component.saveIdentifier('patreonId')
    expect(api.updateAdminUserPatreonId).not.toHaveBeenCalled()
    component.draftPatreonId.set('123')
    component.saveIdentifier('patreonId')
    expect(component.draftPatreonId()).toBe('123')
    expect(component.busy()).toBe(false)
    expect(toast.show).toHaveBeenCalledWith(
      'admin_user.identifier_in_use',
      expect.anything(),
    )
  })

  it('serializes independent mutations while an identifier save is pending', () => {
    const pending = new Subject<ApiAdminUser>()
    const { component, api } = setup({
      updateAdminUserPatreonId: vi.fn(() => pending),
    })
    component.ngOnInit()
    component.draftPatreonId.set('123')
    component.draftVeknId.set('00123')
    component.toggleRole('tester', {
      target: { checked: true },
    } as unknown as Event)
    component.saveIdentifier('patreonId')
    component.saveIdentifier('veknId')
    component.save()
    expect(api.updateAdminUserVeknId).not.toHaveBeenCalled()
    expect(api.updateAdminUserAccess).not.toHaveBeenCalled()
    pending.next({ ...managedUser, patreonId: '123' })
    expect(component.busy()).toBe(false)
  })

  it('emits successful VEKN edits for the public profile to refresh', () => {
    const { component } = setup()
    component.ngOnInit()
    const changed = vi.fn()
    component.veknIdChanged.subscribe(changed)
    component.draftVeknId.set('003120065')
    component.saveIdentifier('veknId')
    expect(changed).toHaveBeenCalledWith('003120065')
  })

  it('replaces the browser authentication when impersonating', () => {
    const { component, auth, activeModal, router } = setup()
    component.ngOnInit()

    component.impersonate()

    expect(auth.impersonate).toHaveBeenCalledWith('target')
    expect(activeModal.close).toHaveBeenCalled()
    expect(router.navigateByUrl).toHaveBeenCalledWith('/')
  })
})
