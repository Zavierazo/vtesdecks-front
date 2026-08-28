import { TestBed } from '@angular/core/testing'
import { LocalStorageService } from './local-storage.service'
import { SpoilerVisitService } from './spoiler-visit.service'

describe('SpoilerVisitService', () => {
  let service: SpoilerVisitService
  let store: Record<string, unknown>
  let setValue: ReturnType<typeof vi.fn>

  beforeEach(() => {
    store = {}
    setValue = vi.fn((key: string, value: unknown) => (store[key] = value))
    TestBed.configureTestingModule({
      providers: [
        SpoilerVisitService,
        {
          provide: LocalStorageService,
          useValue: { getValue: (key: string) => store[key], setValue },
        },
      ],
    })
    service = TestBed.inject(SpoilerVisitService)
  })

  it('shows a deck never visited', () => {
    expect(service.hasNewSpoilers('deck-1', '2026-08-28T12:00:00Z')).toBe(true)
  })

  it('shows a deck updated after it was visited', () => {
    store['spoiler_deck_visits'] = { 'deck-1': '2026-08-20T12:00:00Z' }

    expect(service.hasNewSpoilers('deck-1', '2026-08-28T12:00:00Z')).toBe(true)
  })

  it('does not show a deck visited after its last update', () => {
    store['spoiler_deck_visits'] = { 'deck-1': '2026-08-28T12:00:00Z' }

    expect(service.hasNewSpoilers('deck-1', '2026-08-27T12:00:00Z')).toBe(false)
    expect(service.hasNewSpoilers('deck-2', '2026-08-27T12:00:00Z')).toBe(true)
  })

  it('ignores a missing or invalid deck update', () => {
    expect(service.hasNewSpoilers('deck-1', null)).toBe(false)
    expect(service.hasNewSpoilers('deck-1', 'invalid-date')).toBe(false)
  })

  it('stores the visit date without touching the other decks', () => {
    store['spoiler_deck_visits'] = { 'deck-1': '2026-08-20T12:00:00Z' }

    service.markDeckVisited('deck-2', '2026-08-28T12:00:00Z')

    expect(setValue).toHaveBeenCalledWith('spoiler_deck_visits', {
      'deck-1': '2026-08-20T12:00:00Z',
      'deck-2': '2026-08-28T12:00:00.000Z',
    })
  })

  it('never rolls back a stored visit', () => {
    store['spoiler_deck_visits'] = { 'deck-1': '2026-08-29T12:00:00Z' }

    service.markDeckVisited('deck-1', '2026-08-28T12:00:00Z')
    service.markDeckVisited('deck-1', 'invalid')

    expect(setValue).not.toHaveBeenCalled()
  })

  it('highlights nothing the first time the catalog is stored', () => {
    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).toHaveBeenCalledWith('spoiler_catalog', {
      latest: '2026-08-28T09:00:00.000Z',
      newSince: '2026-08-28T09:00:00.000Z',
    })
    expect(service.isNewCard('2026-08-28T09:00:00Z')).toBe(false)
  })

  it('highlights the cards revealed after the previous batch', () => {
    store['spoiler_catalog'] = {
      latest: '2026-08-20T09:00:00Z',
      newSince: '2026-08-10T09:00:00Z',
    }

    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).toHaveBeenCalledWith('spoiler_catalog', {
      latest: '2026-08-28T09:00:00.000Z',
      newSince: '2026-08-20T09:00:00Z',
    })
    expect(service.isNewCard('2026-08-24T09:00:00Z')).toBe(true)
    expect(service.isNewCard('2026-08-15T09:00:00Z')).toBe(false)
  })

  it('keeps the baseline while no newer card shows up', () => {
    store['spoiler_catalog'] = {
      latest: '2026-08-28T09:00:00Z',
      newSince: '2026-08-20T09:00:00Z',
    }

    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).not.toHaveBeenCalled()
    expect(service.isNewCard('2026-08-24T09:00:00Z')).toBe(true)
  })

  it('highlights no card while there is no baseline', () => {
    expect(service.isNewCard('2026-08-28T12:00:00Z')).toBe(false)
    expect(service.isNewCard('invalid')).toBe(false)
  })

  it('ignores an invalid catalog update', () => {
    service.markSpoilersSeen('invalid')

    expect(setValue).not.toHaveBeenCalled()
  })
})
