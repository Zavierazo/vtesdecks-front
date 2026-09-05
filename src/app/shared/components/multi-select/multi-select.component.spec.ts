import { TestBed } from '@angular/core/testing'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelectComponent } from './multi-select.component'

describe('MultiSelectComponent', () => {
  const createComponent = (allowExclude: boolean) => {
    TestBed.configureTestingModule({ imports: [MultiSelectComponent] })
    const fixture = TestBed.createComponent(MultiSelectComponent)
    fixture.componentRef.setInput('options', [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two', shortLabel: '2' },
    ])
    fixture.componentRef.setInput('controlId', 'test-select')
    fixture.componentRef.setInput('label', 'Options')
    fixture.componentRef.setInput('allowExclude', allowExclude)
    fixture.detectChanges()
    return fixture
  }

  it('cycles through checked, excluded, and unchecked when exclusion is allowed', () => {
    const fixture = createComponent(true)
    const emit = vi.spyOn(fixture.componentInstance.selectionChange, 'emit')

    fixture.componentInstance.toggle('one')
    expect(emit).toHaveBeenLastCalledWith({ selected: ['one'], excluded: [] })

    fixture.componentRef.setInput('selected', ['one'])
    fixture.componentInstance.toggle('one')
    expect(emit).toHaveBeenLastCalledWith({ selected: [], excluded: ['one'] })

    fixture.componentRef.setInput('selected', [])
    fixture.componentRef.setInput('excluded', ['one'])
    fixture.componentInstance.toggle('one')
    expect(emit).toHaveBeenLastCalledWith({ selected: [], excluded: [] })
  })

  it('behaves as a normal check/uncheck multi-select without exclusion', () => {
    const fixture = createComponent(false)
    const emit = vi.spyOn(fixture.componentInstance.selectionChange, 'emit')
    fixture.componentRef.setInput('selected', ['one'])

    fixture.componentInstance.toggle('one')

    expect(emit).toHaveBeenCalledWith({ selected: [], excluded: [] })
  })

  it('uses short labels in the closed summary', () => {
    const fixture = createComponent(true)
    fixture.componentRef.setInput('selected', ['one'])
    fixture.componentRef.setInput('excluded', ['two'])

    expect(fixture.componentInstance.summary()).toBe('One, !2')
  })

  it('keeps exclusive values mutually exclusive with normal values', () => {
    const fixture = createComponent(false)
    const emit = vi.spyOn(fixture.componentInstance.selectionChange, 'emit')
    fixture.componentRef.setInput('exclusiveValues', ['any', 'none'])
    fixture.componentRef.setInput('selected', ['one', 'two'])

    fixture.componentInstance.toggle('any')
    expect(emit).toHaveBeenLastCalledWith({ selected: ['any'], excluded: [] })

    fixture.componentRef.setInput('selected', ['any'])
    fixture.componentInstance.toggle('one')
    expect(emit).toHaveBeenLastCalledWith({ selected: ['one'], excluded: [] })

    fixture.componentRef.setInput('selected', ['any'])
    fixture.componentInstance.toggle('none')
    expect(emit).toHaveBeenLastCalledWith({ selected: ['none'], excluded: [] })
  })

  it('shows no value when nothing is selected', () => {
    const fixture = createComponent(true)

    expect(fixture.componentInstance.summary()).toBe('')
    expect(
      fixture.nativeElement.querySelector('.form-select').textContent.trim(),
    ).toBe('')
  })
})
