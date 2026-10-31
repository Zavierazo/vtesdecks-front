import { HttpErrorResponse } from '@angular/common/http'
import { OnDestroy, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ApiDataService } from '@services'
import { Subject, of, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../../services/connectivity.service'
import { ArchonSettingsComponent } from './archon-settings.component'

describe('Archon settings', () => {
  let component: ArchonSettingsComponent
  const api = {
    getArchonStatus: vi.fn(),
    connectArchon: vi.fn(),
    disconnectArchon: vi.fn(),
  }
  const offline = signal(false)
  beforeEach(() => {
    vi.resetAllMocks()
    offline.set(false)
    api.getArchonStatus.mockReturnValue(
      of({ available: true, linked: true, veknId: '003120065' }),
    )
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiDataService, useValue: api },
        { provide: ConnectivityService, useValue: { offline } },
      ],
    })
    component = TestBed.runInInjectionContext(
      () => new ArchonSettingsComponent(),
    )
    component.ngOnInit()
  })
  afterEach(() => (component as unknown as OnDestroy).ngOnDestroy())

  it('keeps the original link when disconnect fails and permits retry', () => {
    api.disconnectArchon
      .mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 503 })),
      )
      .mockReturnValueOnce(of(undefined))
    component.disconnect()
    expect(component.status()?.veknId).toBe('003120065')
    expect(component.error()).toBe('error')
    component.disconnect()
    expect(component.status()?.linked).toBe(false)
    expect(component.status()?.veknId).toBeNull()
  })

  it('blocks duplicate and offline operations', () => {
    const pending = new Subject<void>()
    api.disconnectArchon.mockReturnValue(pending)
    component.disconnect()
    component.disconnect()
    expect(api.disconnectArchon).toHaveBeenCalledTimes(1)
    pending.error(new HttpErrorResponse({ status: 503 }))
    offline.set(true)
    component.disconnect()
    expect(api.disconnectArchon).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed or unexpected authorization destinations', () => {
    component.status.set({ available: true, linked: false, veknId: null })
    for (const authorizationUrl of [
      'not a URL',
      'https://example.test/consent',
      'https://archon.vekn.net/other',
    ]) {
      api.connectArchon.mockReturnValue(of({ authorizationUrl }))
      component.connect()
      expect(component.error()).toBe('error')
      expect(component.busy()).toBe(false)
    }
  })
})
