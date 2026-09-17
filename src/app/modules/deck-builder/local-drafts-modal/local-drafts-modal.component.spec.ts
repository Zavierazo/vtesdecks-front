import { TestBed } from '@angular/core/testing'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalDeckDraftsService } from '../../../services/local-deck-drafts.service'
import { LocalDraftsModalComponent } from './local-drafts-modal.component'

describe('Local draft picker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    TestBed.resetTestingModule()
  })

  function setup() {
    TestBed.configureTestingModule({
      providers: [{ provide: NgbActiveModal, useValue: {} }],
    })
    const component = TestBed.runInInjectionContext(
      () => new LocalDraftsModalComponent(),
    )
    const drafts = TestBed.inject(LocalDeckDraftsService)
    const first = drafts.save('First', { name: 'First deck', cards: [] })!
    const second = drafts.save('Second', { name: 'Second deck', cards: [] })!
    return { component, drafts, first, second }
  }

  it('removes only the selected draft and keeps the others for later', () => {
    const { component, drafts, first, second } = setup()
    component.deletingId = first.id
    component.remove(first.id)
    expect(drafts.drafts()).toEqual([second])
    expect(component.deletingId).toBeUndefined()
  })

  it('keeps the draft and confirmation visible if deletion fails', () => {
    const { component, drafts, first } = setup()
    component.deletingId = first.id
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    component.remove(first.id)
    expect(drafts.storageError()).toBe(true)
    expect(drafts.get(first.id)).toBeDefined()
    expect(component.deletingId).toBe(first.id)
  })
})
