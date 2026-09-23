import { TestBed } from '@angular/core/testing'
import { TranslocoTestingModule } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, ToastService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuickReactionsComponent } from './quick-reactions.component'

describe('QuickReactionsComponent read-only decks', () => {
  afterEach(() => TestBed.resetTestingModule())

  async function setup(
    readonly: boolean,
    targetType = 'deck',
    display = 'full',
  ) {
    const reactDeck = vi.fn(() => of(true))
    const reactComment = vi.fn(() => of(true))
    TestBed.configureTestingModule({
      imports: [
        QuickReactionsComponent,
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [
        { provide: ApiDataService, useValue: { reactDeck, reactComment } },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: NgbModal, useValue: { open: vi.fn() } },
        {
          provide: AuthQuery,
          useValue: {
            isAuthenticated: () => true,
            selectAuthenticated: () => of(true),
          },
        },
      ],
    })
    const fixture = TestBed.createComponent(QuickReactionsComponent)
    fixture.componentRef.setInput('targetType', targetType)
    fixture.componentRef.setInput('targetId', '123')
    fixture.componentRef.setInput('display', display)
    fixture.componentRef.setInput('readonly', readonly)
    fixture.componentRef.setInput('reactions', [
      { reaction: 'spicy', count: 2, reacted: true },
    ])
    await fixture.whenStable()
    return { fixture, reactDeck, reactComment }
  }

  it('disables rendered buttons and blocks direct toggles without changing counts', async () => {
    const { fixture, reactDeck } = await setup(true)
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[]
    expect(buttons.length).toBe(6)
    expect(buttons.every((button) => button.disabled)).toBe(true)
    buttons[0].click()
    fixture.componentInstance.toggle('spicy')
    expect(reactDeck).not.toHaveBeenCalled()
    expect(
      fixture.componentInstance
        .allChips()
        .find((chip) => chip.reaction === 'spicy'),
    ).toMatchObject({ count: 2, reacted: true })
  })

  it('hides the compact picker while read-only and allows reactions when unlocked', async () => {
    const { fixture, reactDeck } = await setup(true, 'deck', 'compact')
    expect(
      fixture.nativeElement.querySelector('.reaction-chip--add'),
    ).toBeNull()
    fixture.componentRef.setInput('readonly', false)
    await fixture.whenStable()
    expect(
      fixture.nativeElement.querySelector('.reaction-chip--add'),
    ).not.toBeNull()
    fixture.componentInstance.toggle('spicy')
    expect(reactDeck).toHaveBeenCalledWith('123', 'spicy', false)
  })

  it('keeps comment reactions interactive', async () => {
    const { fixture, reactComment } = await setup(false, 'comment')
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    button.click()
    expect(reactComment).toHaveBeenCalledWith(123, 'thumbs_up', true)
  })
})
