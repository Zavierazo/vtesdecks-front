import { ChangeDetectorRef, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { of, Subject } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiUserSettingsResponse } from '@models'
import { ConnectivityService } from '../../../services/connectivity.service'
import { UserSettingsComponent } from './user-settings.component'

describe('Independent settings saves', () => {
  let component: UserSettingsComponent
  let response: Subject<ApiUserSettingsResponse>
  const updateSettings = vi.fn()
  const offline = signal(false)
  beforeEach(() => {
    response = new Subject<ApiUserSettingsResponse>()
    updateSettings.mockReset().mockReturnValue(response)
    offline.set(false)
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthQuery,
          useValue: {
            selectAuthenticated: () => of(true),
            selectEmail: () => of('user@example.com'),
            selectDisplayName: () => of('Saved name'),
            selectProfileImage: () => of('avatar.jpg'),
            getDisplayName: () => 'Saved name',
            getProfileImage: () => 'avatar.jpg',
            getCardPrintingPreference: () => 'LATEST',
          },
        },
        { provide: AuthService, useValue: { updateSettings } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        { provide: ConnectivityService, useValue: { offline } },
      ],
    })
    component = TestBed.runInInjectionContext(() => new UserSettingsComponent())
    component.ngOnInit()
  })
  const passwords = {
    password: 'oldPassword1',
    newPassword: 'newPassword2',
    confirmNewPassword: 'newPassword2',
  }
  it('saves the profile without submitting an incomplete password change', () => {
    component.passwordForm.patchValue({ password: 'old' })
    component.profileForm.patchValue({ displayName: 'Edited name' })
    component.saveProfile()
    expect(updateSettings).toHaveBeenCalledWith({
      displayName: 'Edited name',
      profileImage: 'avatar.jpg',
      cardPrintingPreference: 'LATEST',
    })
    response.next({ successful: true })
    response.complete()
    expect(component.password?.value).toBe('old')
    expect(component.feedback.password.message).toBe('')
    expect(component.saving).toBeNull()
  })
  it('changes password using the saved profile and keeps pending profile edits', () => {
    component.profileForm.patchValue({ displayName: '' })
    component.passwordForm.setValue(passwords)
    component.changePassword()
    expect(updateSettings).toHaveBeenCalledWith({
      displayName: 'Saved name',
      profileImage: 'avatar.jpg',
      cardPrintingPreference: 'LATEST',
      password: passwords.password,
      newPassword: passwords.newPassword,
    })
    response.next({ successful: true })
    response.complete()
    expect(component.password?.value).toBeNull()
    expect(component.displayName?.value).toBe('')
  })
  it('requires passwords and clears mismatch validation after correction', () => {
    component.changePassword()
    component.passwordForm.setValue({
      ...passwords,
      confirmNewPassword: 'different2',
    })
    component.changePassword()
    expect(updateSettings).not.toHaveBeenCalled()
    component.confirmNewPassword?.setValue(passwords.newPassword)
    component.changePassword()
    expect(updateSettings).toHaveBeenCalledOnce()
  })
  it('prevents overlapping requests and retains password values on failure', () => {
    component.passwordForm.setValue(passwords)
    component.changePassword()
    component.saveProfile()
    component.changePassword()
    expect(updateSettings).toHaveBeenCalledOnce()
    response.error(new Error('network'))
    expect(component.passwordForm.getRawValue()).toEqual(passwords)
    expect(component.saving).toBeNull()
    expect(component.feedback.password.successful).toBe(false)
    expect(component.feedback.profile.message).toBe('')
  })
  it('requires a real profile change, including after reverting edits', () => {
    expect(component.profileChanged).toBe(false)
    component.saveProfile()
    expect(updateSettings).not.toHaveBeenCalled()
    component.displayName?.setValue('Edited name')
    expect(component.profileChanged).toBe(true)
    component.displayName?.setValue('Saved name')
    expect(component.profileChanged).toBe(false)
  })
  it('compares against the submitted values without losing edits made during saving', () => {
    component.displayName?.setValue('Submitted name')
    component.saveProfile()
    component.displayName?.setValue('Later edit')
    response.next({ successful: true })
    response.complete()
    expect(component.profileChanged).toBe(true)
    component.displayName?.setValue('Submitted name')
    expect(component.profileChanged).toBe(false)
  })
  it('keeps a failed profile save pending', () => {
    component.profileImage?.setValue('new-avatar.jpg')
    component.saveProfile()
    response.next({ successful: false })
    response.complete()
    expect(component.profileChanged).toBe(true)
  })
  it('does not submit account changes offline', () => {
    offline.set(true)
    component.passwordForm.setValue(passwords)
    component.saveProfile()
    component.changePassword()
    expect(updateSettings).not.toHaveBeenCalled()
  })
})
