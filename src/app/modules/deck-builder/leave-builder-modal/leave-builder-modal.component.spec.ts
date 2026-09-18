import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeaveBuilderModalComponent } from './leave-builder-modal.component'

describe('Leaving the builder', () => {
  afterEach(() => TestBed.resetTestingModule())

  function setup(failed = false) {
    const close = vi.fn()
    const saveDraft = vi.fn()
    const discardCurrentDraft = vi.fn(() => !failed)
    TestBed.configureTestingModule({
      providers: [
        { provide: NgbActiveModal, useValue: { close } },
        {
          provide: DeckBuilderService,
          useValue: {
            saveDraft,
            discardCurrentDraft,
            draftStorageError: signal(failed),
          },
        },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new LeaveBuilderModalComponent(),
    )
    return { component, close, saveDraft, discardCurrentDraft }
  }

  it('keeps the draft before allowing navigation', () => {
    const { component, saveDraft, discardCurrentDraft, close } = setup()
    component.keep()
    expect(saveDraft).toHaveBeenCalledOnce()
    expect(discardCurrentDraft).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(true)
  })

  it('discards only when explicitly selected', () => {
    const { component, discardCurrentDraft, close } = setup()
    component.discard()
    expect(discardCurrentDraft).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledWith(true)
  })

  it('does not allow a failed keep or discard to close the dialog', () => {
    const { component, close } = setup(true)
    component.keep()
    component.discard()
    expect(close).not.toHaveBeenCalled()
  })
})
