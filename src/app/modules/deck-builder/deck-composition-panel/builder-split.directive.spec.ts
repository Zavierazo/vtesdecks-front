import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuilderSplitDirective } from './builder-split.directive'

@Component({
  imports: [BuilderSplitDirective],
  template: '<div appBuilderSplit><input value="search kept" /></div>',
})
class HostComponent {}

describe('Builder split preference and available width', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    TestBed.resetTestingModule()
  })

  it('restores visibility after resizing, shares preference, and disconnects on close', async () => {
    let resize!: ResizeObserverCallback
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback
        }
        observe = vi.fn()
        disconnect = disconnect
      },
    )
    const fixture = TestBed.createComponent(HostComponent)
    await fixture.whenStable()
    const directive = fixture.debugElement
      .query(By.directive(BuilderSplitDirective))
      .injector.get(BuilderSplitDirective)
    const input = fixture.nativeElement.querySelector('input')
    const setWidth = (width: number) =>
      resize(
        [{ contentRect: { width } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
    setWidth(1280)
    expect(directive.visible()).toBe(true)
    directive.toggle()
    expect(directive.visible()).toBe(false)
    expect(localStorage.getItem('deck-builder-split')).toBe('false')
    setWidth(1279)
    expect(directive.available()).toBe(false)
    setWidth(1400)
    expect(directive.visible()).toBe(false)
    directive.toggle()
    setWidth(600)
    expect(directive.visible()).toBe(false)
    setWidth(1280)
    expect(directive.visible()).toBe(true)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('input')).toBe(input)
    fixture.destroy()
    expect(disconnect).toHaveBeenCalledOnce()
    localStorage.setItem('deck-builder-split', 'false')
    const reopened = TestBed.createComponent(HostComponent)
    await reopened.whenStable()
    const restored = reopened.debugElement
      .query(By.directive(BuilderSplitDirective))
      .injector.get(BuilderSplitDirective)
    setWidth(1280)
    expect(restored.visible()).toBe(false)
  })

  it('keeps toggling when storage reads and writes fail', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Denied')
    })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { width: 1400 } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          )
        }
        disconnect = vi.fn()
      },
    )
    const fixture = TestBed.createComponent(HostComponent)
    await fixture.whenStable()
    const directive = fixture.debugElement
      .query(By.directive(BuilderSplitDirective))
      .injector.get(BuilderSplitDirective)
    expect(directive.visible()).toBe(true)
    expect(() => directive.toggle()).not.toThrow()
    expect(directive.visible()).toBe(false)
    directive.toggle()
    expect(directive.visible()).toBe(true)
  })
})

