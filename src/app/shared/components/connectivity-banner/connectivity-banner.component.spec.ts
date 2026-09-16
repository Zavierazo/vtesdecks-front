import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Subject } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectivityService } from '../../../services/connectivity.service'
import { ConnectivityBannerComponent } from './connectivity-banner.component'

describe('Connectivity banner', () => {
  const offline = signal(false)
  let changed: Subject<void>
  let banner: ConnectivityBannerComponent
  beforeEach(() => {
    vi.useFakeTimers()
    offline.set(false)
    changed = new Subject<void>()
    TestBed.configureTestingModule({
      providers: [
        { provide: ConnectivityService, useValue: { offline, changed } },
      ],
    })
    banner = TestBed.runInInjectionContext(
      () => new ConnectivityBannerComponent(),
    )
  })
  afterEach(() => {
    TestBed.resetTestingModule()
    vi.useRealTimers()
  })
  it('does not announce ordinary online resumes', () => {
    changed.next()
    expect(banner.reconnected()).toBe(false)
  })
  it('announces recovery for 1.8 seconds', () => {
    offline.set(true)
    changed.next()
    offline.set(false)
    changed.next()
    expect(banner.reconnected()).toBe(true)
    vi.advanceTimersByTime(1800)
    expect(banner.reconnected()).toBe(false)
  })
  it('cancels a previous recovery when the connection drops again', () => {
    offline.set(true)
    changed.next()
    offline.set(false)
    changed.next()
    vi.advanceTimersByTime(1000)
    offline.set(true)
    changed.next()
    expect(banner.reconnected()).toBe(false)
    offline.set(false)
    changed.next()
    vi.advanceTimersByTime(1000)
    expect(banner.reconnected()).toBe(true)
    vi.advanceTimersByTime(800)
    expect(banner.reconnected()).toBe(false)
  })
})
