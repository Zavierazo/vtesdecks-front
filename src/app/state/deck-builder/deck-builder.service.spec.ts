import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiDeckBuilder } from '@models'
import { ApiDataService } from '@services'
import { LibraryQuery } from '../library/library.query'
import { CollectionApiDataService } from '../../modules/collection/services/collection-api.data.service'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderService } from './deck-builder.service'
import { DeckBuilderStore } from './deck-builder.store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstValueFrom, of, throwError } from 'rxjs'

describe('Deck builder draft recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    TestBed.resetTestingModule()
  })

  function setup(current: ApiDeckBuilder) {
    let state = current
    const api = {
      saveDeckBuilder: vi.fn((deck: ApiDeckBuilder) =>
        of({ ...deck, id: 'saved-account-deck' }),
      ),
    }
    const collectionApi = { getCards: vi.fn(() => of({ content: [] })) }
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DeckBuilderStore,
          useValue: {
            getValue: () => state,
            getLoading: () => false,
            setLoading: vi.fn(),
            reset: () => {
              state = { cards: [], published: false, collection: false }
            },
            updateName: (name: string) => {
              state = { ...state, name }
            },
            updatePublished: (published: boolean) => {
              state = { ...state, published }
            },
            updateCollection: (collection: boolean) => {
              state = { ...state, collection }
            },
            updateCollectionCards: vi.fn(),
            setSaved: vi.fn(),
            update: (update: (value: ApiDeckBuilder) => ApiDeckBuilder) => {
              state = update(state)
            },
          },
        },
        ...[LibraryQuery].map((provide) => ({
          provide,
          useValue: {},
        })),
        { provide: CollectionApiDataService, useValue: collectionApi },
        {
          provide: DeckBuilderQuery,
          useValue: { getValue: () => state, hasCollectionCards: () => false },
        },
        { provide: ApiDataService, useValue: api },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
    const service = TestBed.inject(DeckBuilderService)
    vi.spyOn(service, 'validateDeck').mockReturnValue(true)
    return { service, state: () => state, api, collectionApi }
  }

  it('sets quantities atomically, preserves metadata and considering cards, and saves once', () => {
    const { service, state } = setup({
      cards: [{ id: 100001, number: 3, type: 'Action' }],
    })
    Object.assign(TestBed.inject(LibraryQuery), {
      getEntity: () => ({ type: 'Action' }),
    })
    const save = vi.spyOn(service, 'saveDraft').mockImplementation(() => undefined)
    const store = TestBed.inject(DeckBuilderStore)
    service.setCardQuantity(100001, 8)
    expect(state().cards).toEqual([{ id: 100001, number: 8, type: 'Action' }])
    expect(service.validateDeck).toHaveBeenCalledTimes(1)
    expect(store.setSaved).toHaveBeenCalledExactlyOnceWith(false)
    expect(save).toHaveBeenCalledTimes(1)
    service.setCardQuantity(100001, 0)
    expect(state().cards).toEqual([{ id: 100001, number: 0, type: 'Action' }])
    service.setCardQuantity(100002, 5)
    expect(state().cards).toContainEqual({
      id: 100002,
      number: 5,
      type: 'Action',
    })
    expect(save).toHaveBeenCalledTimes(3)
  })

  it('does not dirty drafts for invalid or unchanged quantities', () => {
    const { service, state } = setup({ cards: [{ id: 100001, number: 3 }] })
    const save = vi.spyOn(service, 'saveDraft').mockImplementation(() => undefined)
    for (const quantity of [
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      3,
    ]) {
      service.setCardQuantity(100001, quantity)
    }
    service.setCardQuantity(100002, 0)
    expect(state().cards).toEqual([{ id: 100001, number: 3 }])
    expect(save).not.toHaveBeenCalled()
    expect(service.validateDeck).not.toHaveBeenCalled()
  })

  it.each(['crypt', 'library'])(
    'reports missing %s metadata without losing deck entries',
    (kind) => {
      const cards = [
        { id: 200001, number: 12 },
        { id: 100001, number: 60 },
      ]
      const { service, state } = setup({ cards })
      vi.mocked(service.validateDeck).mockRestore()
      const query = TestBed.inject(DeckBuilderQuery)
      Object.assign(query, {
        getCrypt: () => (kind === 'crypt' ? [undefined] : []),
        getLibrary: () => (kind === 'library' ? [undefined] : []),
      })
      const store = TestBed.inject(DeckBuilderStore)
      Object.assign(store, {
        setCryptErrors: vi.fn(),
        setLibraryErrors: vi.fn(),
      })
      expect(service.validateDeck()).toBe(false)
      expect(
        kind === 'crypt' ? store.setCryptErrors : store.setLibraryErrors,
      ).toHaveBeenCalledWith(['deck_builder_service.missing_cards'])
      expect(state().cards).toEqual(cards)
    },
  )

  it('recovers text-only drafts even before any cards have been added', () => {
    const { service } = setup({ cards: [] })
    expect(service.hasDraftChanges({ name: 'Offline draft', cards: [] })).toBe(
      true,
    )
    expect(
      service.hasDraftChanges({ description: 'New guide', cards: [] }),
    ).toBe(true)
    expect(service.hasDraftChanges({ cards: [] })).toBe(false)
  })

  it('recovers removing every card and ignores card ordering alone', () => {
    const cards = [
      { id: 200001, number: 2 },
      { id: 100001, number: 5 },
    ]
    const { service } = setup({ cards })
    expect(service.hasDraftChanges({ cards: [] })).toBe(true)
    expect(service.hasDraftChanges({ cards: [...cards].reverse() })).toBe(false)
  })

  it('restores publication changes without changing the saved deck identity', () => {
    const { service, state } = setup({
      id: 'existing',
      published: true,
      cards: [],
    })
    const draft = {
      id: 'other',
      published: false,
      name: 'Recovered',
      cards: [],
    }
    expect(service.hasDraftChanges(draft)).toBe(true)
    service.restoreFromDraft(draft)
    expect(state()).toMatchObject({
      id: 'existing',
      published: false,
      name: 'Recovered',
      saved: false,
    })
  })

  it('opens a local draft without a server identity and autosaves only that draft', () => {
    const { service, state } = setup({ id: 'existing', cards: [] })
    const first = service.localDrafts.save('First', { name: 'A', cards: [] })!
    const second = service.localDrafts.save('Second', { name: 'B', cards: [] })!
    expect(service.openLocalDraft(first.id)).toBe(true)
    expect(state().id).toBeUndefined()
    service.updateName('Changed')
    expect(service.localDrafts.get(first.id)?.deck.name).toBe('Changed')
    expect(service.localDrafts.get(second.id)?.deck.name).toBe('B')
    expect(service.draftStorageError()).toBe(false)
  })

  it('keeps the current editor when a named draft cannot be opened', () => {
    const { service, state } = setup({ name: 'Unsaved', cards: [] })
    expect(service.openLocalDraft('missing')).toBe(false)
    expect(state().name).toBe('Unsaved')
  })

  it('reports automatic recovery storage failures', () => {
    const { service } = setup({ name: 'Unsaved', cards: [] })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    service.saveDraft()
    expect(service.draftStorageError()).toBe(true)
  })

  it('removes a new deck draft after saving and links further edits to the saved deck', async () => {
    const { service, state, api } = setup({
      id: 'original-account-deck',
      cards: [],
    })
    const draft = service.localDrafts.save('Local', {
      name: 'Local deck',
      cards: [{ id: 100001, number: 2 }],
    })!
    service.openLocalDraft(draft.id)
    await firstValueFrom(service.saveDeck())
    expect(api.saveDeckBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        id: undefined,
        published: false,
        collection: false,
      }),
    )
    expect(state().id).toBe('saved-account-deck')
    expect(service.activeLocalDraftId()).toBeUndefined()
    expect(service.localDrafts.get(draft.id)).toBeUndefined()
    expect(service.localDrafts.reload()).toBe(true)
    expect(service.localDrafts.drafts()).toHaveLength(0)

    service.updateName('Further edits')
    const recoveryId = service.activeLocalDraftId()!
    expect(service.localDrafts.get(recoveryId)).toMatchObject({
      sourceDeckId: 'saved-account-deck',
      deck: { name: 'Further edits', cards: [{ id: 100001, number: 2 }] },
    })
    expect(service.localDrafts.newDeckDrafts()).toHaveLength(0)
    service.updateName('More edits')
    expect(service.activeLocalDraftId()).toBe(recoveryId)
    expect(service.localDrafts.drafts()).toHaveLength(1)

    await firstValueFrom(service.saveDeck())
    expect(service.localDrafts.drafts()).toHaveLength(0)
  })

  it('preserves the active draft when the account save fails', async () => {
    const { service, api } = setup({ name: 'Unsaved', cards: [] })
    service.saveDraft()
    const draftId = service.activeLocalDraftId()!
    api.saveDeckBuilder.mockReturnValueOnce(
      throwError(() => new Error('Save failed')),
    )

    await expect(firstValueFrom(service.saveDeck())).rejects.toThrow(
      'Save failed',
    )
    expect(service.activeLocalDraftId()).toBe(draftId)
    expect(service.localDrafts.get(draftId)?.deck.name).toBe('Unsaved')
  })

  it('keeps saved-deck identity and removes its draft after saving', async () => {
    const { service, api } = setup({
      id: 'existing',
      name: 'Edited',
      cards: [],
    })
    service.saveDraft()
    const id = service.activeLocalDraftId()!
    expect(service.openLocalDraft(id)).toBe(false)
    await firstValueFrom(service.saveDeck())
    expect(api.saveDeckBuilder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'existing', name: 'Edited' }),
    )
    expect(service.localDrafts.get(id)).toBeUndefined()
  })

  it.each([true, false])(
    'restores the selected publication status: %s',
    (published) => {
      const { service, state } = setup({
        name: 'Visibility',
        cards: [],
        published: !published,
      })
      service.updatePublished(published)
      const id = service.activeLocalDraftId()!
      expect(service.openLocalDraft(id)).toBe(true)
      expect(state().published).toBe(published)
    },
  )

  it('creates one automatic draft per editing session and discards only the active draft', () => {
    const { service } = setup({ name: 'First', cards: [] })
    service.saveDraft()
    const first = service.activeLocalDraftId()!
    service.updateName('First revised')
    expect(service.localDrafts.drafts()).toHaveLength(1)
    service.activeLocalDraftId.set(undefined)
    service.updateName('Second')
    expect(service.localDrafts.drafts()).toHaveLength(2)
    expect(service.discardCurrentDraft()).toBe(true)
    expect(service.localDrafts.drafts().map((draft) => draft.id)).toEqual([
      first,
    ])
  })

  it('migrates legacy recovery without losing its contents or publication status', () => {
    const { service } = setup({ cards: [] })
    localStorage.setItem(
      'deckBuilderDraft_new',
      JSON.stringify({
        name: 'Legacy',
        cards: [],
        published: true,
        savedAt: Date.now(),
      }),
    )
    service.migrateLegacyDrafts()
    expect(service.localDrafts.drafts()).toHaveLength(1)
    expect(service.localDrafts.drafts()[0].deck).toMatchObject({
      name: 'Legacy',
      published: true,
    })
    expect(localStorage.getItem('deckBuilderDraft_new')).toBeNull()
  })
  it.each([true, false])(
    'restores tracker status %s and loads ownership when enabled',
    (collection) => {
      const { service, state, collectionApi } = setup({
        id: 'existing',
        collection: !collection,
        cards: [],
      })
      const draft = { name: 'Tracker', collection, cards: [] }
      expect(service.hasDraftChanges({ ...state(), collection })).toBe(true)
      service.restoreFromDraft(draft)
      expect(state().collection).toBe(collection)
      expect(collectionApi.getCards).toHaveBeenCalledTimes(collection ? 1 : 0)
      const fresh = service.localDrafts.save('New deck', draft)!
      expect(service.openLocalDraft(fresh.id)).toBe(true)
      expect(state().collection).toBe(collection)
    },
  )
  it('autosaves tracker-only changes immediately', () => {
    const { service } = setup({ cards: [], collection: false })
    service.updateCollection(true).subscribe()
    const draft = service.localDrafts.get(service.activeLocalDraftId()!)!
    expect(draft.deck.collection).toBe(true)
    service.updateCollection(false).subscribe()
    expect(service.localDrafts.get(draft.id)?.deck.collection).toBe(false)
  })
  it('restores removing a Limited Format instead of retaining the saved setting', () => {
    const { service, state } = setup({
      cards: [],
      extra: {
        limitedFormat: {
          id: 42,
          name: 'Format',
          sets: {},
          allowed: { crypt: {}, library: {} },
          banned: { crypt: {}, library: {} },
        },
      },
    })
    service.restoreFromDraft({ cards: [] })
    expect(state().extra).toBeUndefined()
  })
})
