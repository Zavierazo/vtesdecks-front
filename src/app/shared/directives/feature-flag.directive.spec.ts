import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { FeatureFlagStore } from '@state/feature-flag/feature-flag.store'
import { describe, expect, it } from 'vitest'
import { FeatureFlagDirective } from './feature-flag.directive'

@Component({
  template: `<div *featureFlag="'my_feature'" id="gated">gated content</div>`,
  imports: [FeatureFlagDirective],
})
class HostComponent {}

describe('FeatureFlagDirective', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] })
    const fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
    return { fixture, store: TestBed.inject(FeatureFlagStore) }
  }

  function gatedElement(fixture: { nativeElement: HTMLElement }) {
    return fixture.nativeElement.querySelector('#gated')
  }

  it('hides the template when the flag is missing', () => {
    const { fixture } = setup()
    TestBed.tick()
    fixture.detectChanges()
    expect(gatedElement(fixture)).toBeNull()
  })

  it('shows and hides the template when the flag flips', () => {
    const { fixture, store } = setup()

    store.setFlags([{ key: 'my_feature', type: 'BOOLEAN', value: true }])
    TestBed.tick()
    fixture.detectChanges()
    expect(gatedElement(fixture)).not.toBeNull()

    store.setFlag({ key: 'my_feature', type: 'BOOLEAN', value: false })
    TestBed.tick()
    fixture.detectChanges()
    expect(gatedElement(fixture)).toBeNull()
  })
})
