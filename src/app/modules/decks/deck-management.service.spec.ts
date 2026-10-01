import { DeckStore } from '@state/deck/deck.store'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDeck } from '@models'
import { ApiDataService, ToastService } from '@services'
import { DeckShareService } from '../../services/deck-share.service'
import { AuthQuery } from '@state/auth/auth.query'
import { DecksService } from '@state/decks/decks.service'
import { DecksStore } from '@state/decks/decks.store'
import { BehaviorSubject, of, Subject } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeckManagementService } from './deck-management.service'

describe('My decks management', () => {
  let service: DeckManagementService
  let store: DecksStore
  let params: BehaviorSubject<Record<string, string>>
  let user: BehaviorSubject<string>
  let api: Record<string, ReturnType<typeof vi.fn>>
  let modal: { open: ReturnType<typeof vi.fn> }
  const deck = (id: string, owner = true) =>
    ({ id, owner, published: false, collection: false }) as ApiDeck

  beforeEach(() => {
    params = new BehaviorSubject<Record<string, string>>({ type: 'USER' })
    user = new BehaviorSubject('owner')
    api = {
      setDeckVisibility: vi.fn(),
      canPublishDeck: vi.fn(() => of(true)),
      updateCollectionTracker: vi.fn(),
      deleteDeckBuilder: vi.fn(),
    }
    modal = {
      open: vi.fn(() => ({
        componentInstance: {},
        result: Promise.resolve('DELETE'),
      })),
    }
    TestBed.configureTestingModule({
      providers: [
        DeckManagementService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: params,
            params: of({}),
            snapshot: { queryParams: params.value },
          },
        },
        { provide: AuthQuery, useValue: { selectUser: () => user } },
        { provide: ApiDataService, useValue: api },
        { provide: NgbModal, useValue: modal },
        {
          provide: DecksService,
          useValue: { refreshLoaded: vi.fn(() => of({})) },
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string, values: unknown) =>
              JSON.stringify([key, values]),
          },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: DeckShareService, useValue: { share: vi.fn() } },
      ],
    })
    store = TestBed.inject(DecksStore)
    service = TestBed.inject(DeckManagementService)
    store.add([deck('a'), deck('b'), deck('foreign', false)])
    TestBed.tick()
  })

  it('updates the open deck without replacing its cards or metadata', async () => {
    const detail = TestBed.inject(DeckStore)
    const current = {
      ...deck('a'),
      description: 'Keep description',
      crypt: [],
      library: [],
    }
    detail.update(() => ({ deck: current }))
    api['setDeckVisibility'].mockReturnValue(of(true))
    await service.quickAction(current, 'visibility')
    expect(detail.getValue().deck).toEqual({ ...current, published: true })
    expect(detail.getValue().deck?.crypt).toBe(current.crypt)
  })

  it('retains the open deck visibility when an update is rejected', async () => {
    const detail = TestBed.inject(DeckStore)
    const current = { ...deck('a'), published: true }
    detail.update(() => ({ deck: current }))
    api['setDeckVisibility'].mockReturnValue(of(false))
    await service.quickAction(current, 'visibility')
    expect(detail.getValue().deck).toBe(current)
  })

  it('keeps the displayed tracker state when the server returns false', async () => {
    api['updateCollectionTracker'].mockReturnValue(of(false))
    await service.quickAction(deck('a'), 'tracker')
    expect(store.getEntities()[0].collection).toBe(false)
    expect(TestBed.inject(ToastService).show).toHaveBeenCalledOnce()
  })

  it('updates visibility only after success and blocks duplicate clicks', async () => {
    const response = new Subject<boolean>()
    api['setDeckVisibility'].mockReturnValue(response)
    const request = service.quickAction(deck('a'), 'visibility')
    await service.quickAction(deck('a'), 'visibility')
    await vi.waitFor(() =>
      expect(api['setDeckVisibility']).toHaveBeenCalledTimes(1),
    )
    expect(store.getEntities()[0].published).toBe(false)
    response.next(true)
    await request
    expect(store.getEntities()[0].published).toBe(true)
  })

  it('blocks invalid decks before confirmation and never sends a publish request', async () => {
    api['canPublishDeck'].mockReturnValue(of(false))
    await service.quickAction(deck('a'), 'visibility')
    expect(modal.open).not.toHaveBeenCalled()
    expect(api['setDeckVisibility']).not.toHaveBeenCalled()
    expect(store.getEntities()[0].published).toBe(false)
    expect(TestBed.inject(ToastService).show).toHaveBeenCalledOnce()
  })

  it('does not publish when confirmation is cancelled', async () => {
    modal.open.mockReturnValue({
      componentInstance: {},
      result: Promise.resolve(false),
    })
    await service.quickAction(deck('a'), 'visibility')
    expect(api['setDeckVisibility']).not.toHaveBeenCalled()
  })

  it('unpublishes without validation or confirmation', async () => {
    api['setDeckVisibility'].mockReturnValue(of(true))
    await service.quickAction({ ...deck('a'), published: true }, 'visibility')
    expect(api['canPublishDeck']).not.toHaveBeenCalled()
    expect(modal.open).not.toHaveBeenCalled()
    expect(api['setDeckVisibility']).toHaveBeenCalledWith('a', false)
  })

  it('cancels deletion without requests', async () => {
    modal.open.mockReturnValue({
      componentInstance: {},
      result: Promise.resolve(false),
    })
    await service.quickAction(deck('a'), 'delete')
    expect(api['deleteDeckBuilder']).not.toHaveBeenCalled()
    expect(store.getEntities()).toHaveLength(3)
  })

  it('deletes one deck and refreshes the list without resetting the builder', async () => {
    api['deleteDeckBuilder'].mockReturnValue(of(true))
    await service.quickAction(deck('a'), 'delete')
    expect(api['deleteDeckBuilder']).toHaveBeenCalledWith('a', false)
    expect(store.getEntities().some((item) => item.id === 'a')).toBe(false)
    expect(service.pending().size).toBe(0)
  })

  it('keeps a deck when deletion is rejected', async () => {
    api['deleteDeckBuilder'].mockReturnValue(of(false))
    await service.quickAction(deck('a'), 'delete')
    expect(store.getEntities().some((item) => item.id === 'a')).toBe(true)
    expect(TestBed.inject(ToastService).show).toHaveBeenCalledOnce()
  })
})
