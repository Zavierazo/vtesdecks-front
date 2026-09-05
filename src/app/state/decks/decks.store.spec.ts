import { TestBed } from '@angular/core/testing'
import { ApiDeck } from '@models'
import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { DecksStore } from './decks.store'

describe('DecksStore', () => {
  let store: DecksStore

  beforeEach(() => {
    TestBed.configureTestingModule({})
    store = TestBed.inject(DecksStore)
  })

  it('marks the cached browser deck as viewed', async () => {
    store.add([
      { id: 'deck-1', visitStatus: 'UPDATED' } as ApiDeck,
      { id: 'deck-2' } as ApiDeck,
    ])

    store.markVisited('deck-1')

    const decks = await firstValueFrom(store.selectEntities())
    expect(decks[0].visitStatus).toBe('VIEWED')
    expect(decks[1].visitStatus).toBeUndefined()
  })

  it('does not mark restorable decks as viewed', () => {
    store.updateRestorableDecks([{ id: 'deck-1' } as ApiDeck])

    store.markVisited('deck-1')

    expect(store.getValue().restorableDecks[0].visitStatus).toBeUndefined()
  })
})
