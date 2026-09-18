import { TestBed } from '@angular/core/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckShareService } from '../../../services/deck-share.service'
import { decodeSnapshot } from '../../../utils/deck-snapshot'
import { ShareDeckComponent } from './share-deck.component'

describe('ShareDeckComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    TestBed.resetTestingModule()
  })
  it('prepares the latest snapshot even when sharing a saved deck is disabled', async () => {
    const share = vi.fn()
    TestBed.configureTestingModule({
      providers: [{ provide: DeckShareService, useValue: { share } }],
    })
    const component = TestBed.runInInjectionContext(
      () => new ShareDeckComponent(),
    )
    component.disabled = true
    component.snapshot = {
      name: 'Old',
      author: '',
      description: '',
      cards: [[200001, 1]],
    }
    component.snapshot = {
      name: 'Unsaved',
      author: 'Author',
      description: 'Latest',
      cards: [
        [200001, 4],
        [100001, 0],
      ],
    }
    expect(component.url()).not.toBe('')
    const decoded = await decodeSnapshot(component.url())
    expect(decoded).toEqual({
      name: 'Unsaved',
      author: 'Author',
      description: 'Latest',
      cards: [
        [200001, 4],
        [100001, 0],
      ],
    })
    component.shareSnapshot()
    expect(share).toHaveBeenCalledWith(component.url())
  })
})
