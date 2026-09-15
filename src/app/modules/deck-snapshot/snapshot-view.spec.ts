import { ApiCrypt, ApiLibrary } from '@models'
import { describe, expect, it } from 'vitest'
import { DeckSnapshotV1 } from '../../models/deck-snapshot'
import { snapshotView } from './snapshot-view'

describe('snapshot cards and statistics', () => {
  const snapshot: DeckSnapshotV1 = {
    name: 'Example',
    author: 'Author',
    description: 'Original\n\n**Description**',
    cards: [
      [200001, 3],
      [200002, 2],
      [200003, 0],
      [100001, 4],
    ],
  }
  const crypt = [
    {
      id: 200001,
      name: 'François',
      capacity: 4,
      adv: true,
      clan: 'Toreador',
      group: 6,
      superiorDisciplines: ['Presence'],
      disciplines: ['Presence', 'Auspex'],
    },
    { id: 200002, name: 'Second', capacity: 9, clan: 'Toreador', group: 6 },
    { id: 200003, name: 'Unused', capacity: 11, clan: 'Toreador', group: 6 },
  ] as ApiCrypt[]
  const library = [
    {
      id: 100001,
      name: 'Réaction / spécial',
      type: 'Reaction',
      poolCost: -1,
      bloodCost: 2,
    },
  ] as ApiLibrary[]

  it('weights capacities by copies and excludes zero copies from statistics', () => {
    const view = snapshotView(snapshot, crypt, library)
    expect(view).toMatchObject({
      cryptSize: 5,
      librarySize: 4,
      minCrypt: 21,
      maxCrypt: 26,
      avgCrypt: 6,
      poolCost: 0,
      bloodCost: 8,
    })
    expect(view.crypt[2].number).toBe(0)
  })

  it('preserves unknown IDs and quantities', () => {
    const view = snapshotView(
      { ...snapshot, cards: [...snapshot.cards, [299999, 2]] },
      crypt,
      library,
    )
    expect(view.unknown).toEqual([{ id: 299999, number: 2, type: undefined }])
    expect(view.cryptSize).toBe(7)
  })

  it('handles empty decks without NaN statistics', () => {
    expect(snapshotView({ ...snapshot, cards: [] }, [], [])).toMatchObject({
      cryptSize: 0,
      librarySize: 0,
      avgCrypt: 0,
      minCrypt: 0,
      maxCrypt: 0,
    })
  })
})
