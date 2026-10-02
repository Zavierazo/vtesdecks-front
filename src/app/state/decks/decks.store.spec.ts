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
  it('does not reintroduce deleted decks from stale pages and deduplicates overlap', () => {
    store.add([{ id: 'a' }, { id: 'b' }] as ApiDeck[])
    store.updateTotal(1000)
    store.updatePage(true, 20)
    store.removeDecks(['a', 'unloaded'])
    expect(store.getValue().offset).toBe(19)
    expect(store.getValue().total).toBe(998)
    store.add([{ id: 'a' }, { id: 'b' }, { id: 'c' }] as ApiDeck[])
    expect(store.getEntities().map((deck) => deck.id)).toEqual(['b', 'c'])
    store.patchDeck('b', { published: true })
    store.replaceDecks([
      { id: 'a' },
      { id: 'b', published: false },
    ] as ApiDeck[])
    expect(store.getEntities()).toEqual([{ id: 'b', published: true }])
  })
})
