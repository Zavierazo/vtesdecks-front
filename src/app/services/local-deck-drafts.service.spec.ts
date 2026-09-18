import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalDeckDraftsService } from './local-deck-drafts.service'

describe('LocalDeckDraftsService', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('keeps multiple drafts across reloads with their selected visibility', () => {
    const service = new LocalDeckDraftsService()
    const first = service.save('First', {
      id: 'server-id',
      name: 'Original',
      published: true,
      collection: true,
      cards: [{ id: 200001, number: 0 }],
    })!
    const second = service.save('Second', { name: 'Other', cards: [] })!
    const reopened = new LocalDeckDraftsService()
    expect(reopened.drafts()).toHaveLength(2)
    expect(reopened.get(first.id)?.deck).toEqual({
      name: 'Original',
      description: '',
      published: true,
      collection: true,
      cards: [{ id: 200001, number: 0 }],
    })
    expect(reopened.get(second.id)?.deck.name).toBe('Other')
  })

  it('updates, renames and deletes only the selected draft', () => {
    const service = new LocalDeckDraftsService()
    const first = service.save('First', { cards: [] })!
    const second = service.save('Second', { cards: [] })!
    service.save(
      'First',
      { name: 'Edited', cards: [{ id: 100001, number: 3 }] },
      first.id,
    )
    expect(service.rename(first.id, 'Renamed')).toBe(true)
    expect(service.get(first.id)?.deck.name).toBe('Edited')
    expect(service.get(first.id)?.name).toBe('Renamed')
    expect(service.remove(first.id)).toBe(true)
    expect(new LocalDeckDraftsService().drafts()).toEqual([second])
  })

  it('keeps one draft per saved deck outside the new-deck list', () => {
    const service = new LocalDeckDraftsService()
    const fresh = service.save('New', { cards: [] })!
    const existing = service.save('Saved', { id: 'server-a', cards: [] })!
    service.save('Revised', { id: 'server-a', cards: [] })
    service.save('Other saved deck', { id: 'server-b', cards: [] })
    const reopened = new LocalDeckDraftsService()
    expect(reopened.drafts()).toHaveLength(3)
    expect(reopened.newDeckDrafts()).toEqual([fresh])
    expect(reopened.get(existing.id)?.name).toBe('Revised')
    expect(reopened.get(existing.id)?.sourceDeckId).toBe('server-a')
  })

  it('retains saved drafts and reports failure when storage is full', () => {
    const service = new LocalDeckDraftsService()
    const original = service.save('Original', { cards: [] })!
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    expect(service.save('New', { cards: [] })).toBeUndefined()
    expect(service.remove(original.id)).toBe(false)
    expect(service.storageError()).toBe(true)
    expect(service.drafts()).toEqual([original])
  })

  it('does not overwrite unreadable existing drafts', () => {
    localStorage.setItem('namedDeckDrafts_v1', '{broken')
    const service = new LocalDeckDraftsService()
    expect(service.save('New', { cards: [] })).toBeUndefined()
    expect(localStorage.getItem('namedDeckDrafts_v1')).toBe('{broken')
    expect(service.storageError()).toBe(true)
  })
})
