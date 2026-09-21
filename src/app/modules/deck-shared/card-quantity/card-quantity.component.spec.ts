import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardQuantityComponent } from './card-quantity.component'

describe('Direct card quantity editing', () => {
  afterEach(() => TestBed.resetTestingModule())

  async function setup() {
    TestBed.configureTestingModule({
      imports: [
        CardQuantityComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
    })
    const fixture = TestBed.createComponent(CardQuantityComponent)
    fixture.componentRef.setInput('quantity', 3)
    fixture.componentRef.setInput('name', 'Test card')
    const changed = vi.fn((quantity: number) =>
      fixture.componentRef.setInput('quantity', quantity),
    )
    fixture.componentInstance.quantityChanged.subscribe(changed)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('input')).toBeNull()
    expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('3')
    fixture.nativeElement.querySelector('button').click()
    await fixture.whenStable()
    const field: HTMLInputElement = fixture.nativeElement.querySelector('input')
    return { fixture, field, changed }
  }

  it('commits once on Enter without submitting or triggering card shortcuts', async () => {
    const { fixture, field, changed } = await setup()
    const parent = document.createElement('div')
    document.body.append(parent)
    parent.append(fixture.nativeElement)
    const bubbled = vi.fn()
    parent.addEventListener('keydown', bubbled)
    field.focus()
    field.value = '8'
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    field.dispatchEvent(event)
    await fixture.whenStable()
    expect(changed).toHaveBeenCalledExactlyOnceWith(8)
    expect(field.value).toBe('8')
    expect(event.defaultPrevented).toBe(true)
    expect(bubbled).not.toHaveBeenCalled()
    field.dispatchEvent(new FocusEvent('blur'))
    expect(changed).toHaveBeenCalledTimes(1)
    parent.remove()
  })

  it('cancels Escape without closing the picker', async () => {
    const { fixture, field, changed } = await setup()
    document.body.append(fixture.nativeElement)
    field.focus()
    field.value = '8'
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    await fixture.whenStable()
    expect(field.value).toBe('3')
    expect(changed).not.toHaveBeenCalled()
  })

  it.each(['', '-1', '1.5', '1e2', 'abc', '9007199254740992'])(
    'restores the previous quantity for invalid input %s',
    async (value) => {
      const { field, changed } = await setup()
      field.value = value
      field.dispatchEvent(new FocusEvent('blur'))
      expect(field.value).toBe('3')
      expect(changed).not.toHaveBeenCalled()
    },
  )

  it('commits zero on blur and returns to the number display', async () => {
    const { fixture, field, changed } = await setup()
    field.value = '0'
    field.dispatchEvent(new FocusEvent('blur'))
    await fixture.whenStable()
    expect(changed).toHaveBeenCalledExactlyOnceWith(0)
    expect(fixture.nativeElement.querySelector('input')).toBeNull()
    expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('0')
  })
})
