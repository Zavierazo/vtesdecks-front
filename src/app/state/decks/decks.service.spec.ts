import { TestBed } from '@angular/core/testing'
import { ApiDataService } from '@services'
import { ApiDeck, ApiDecks } from '@models'
import { Subject, of, throwError } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DecksService } from './decks.service'
import { DecksStore } from './decks.store'

describe('Deck browser refresh', () => {
  let service: DecksService
  let store: DecksStore
  const getDecks = vi.fn()
  const page = (ids: string[], total = 100) =>
    ({
      decks: ids.map((id) => ({ id }) as ApiDeck),
      total,
      offset: 0,
      restorableDecks: [],
      currency: 'EUR',
    }) as ApiDecks
  beforeEach(() => {
    getDecks.mockReset()
    TestBed.configureTestingModule({
      providers: [{ provide: ApiDataService, useValue: { getDecks } }],
    })
    service = TestBed.inject(DecksService)
    store = TestBed.inject(DecksStore)
    service.init({ type: 'USER', name: 'filter' })
  })
  it('ignores a page that was started before a management refresh', () => {
    const oldPage = new Subject<ApiDecks>()
    getDecks.mockReturnValueOnce(oldPage).mockReturnValueOnce(of(page(['b'])))
    service.getMore().subscribe()
    service.refreshLoaded().subscribe()
    oldPage.next(page(['deleted-a'], 200))
    oldPage.complete()
    expect(store.getEntities().map((deck) => deck.id)).toEqual(['b'])
    expect(store.getValue().total).toBe(100)
    expect(store.getLoading()).toBe(false)
  })
  it('retains rows and releases loading when refresh fails', () => {
    store.add([{ id: 'a' } as ApiDeck])
    store.setLoading(true)
    getDecks.mockReturnValue(throwError(() => new Error('offline')))
    service.refreshLoaded().subscribe({ error: () => undefined })
    expect(store.getEntities()[0].id).toBe('a')
    expect(store.getLoading()).toBe(false)
  })
})
