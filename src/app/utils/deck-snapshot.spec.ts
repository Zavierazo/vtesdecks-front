import { describe, expect, it } from 'vitest'
import { DeckSnapshot } from '../models/deck-snapshot'
import {
  decodeSnapshot,
  encodeSnapshot,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_URL,
  validateSnapshot,
} from './deck-snapshot'

describe('deck snapshot codec', () => {
  const snapshot: DeckSnapshot = {
    name: 'Séraph 🦇',
    author: '作者',
    description: '**Hola**\n\nDescripción & #?=\n'.repeat(500),
    cards: [
      [200348, 3],
      [100006, 4],
      [201062, 0],
    ],
  }

  it('round-trips Unicode, Markdown, long descriptions and zero quantities through a readable URL', async () => {
    const encoded = await encodeSnapshot(snapshot)
    expect(encoded).toContain('#200348=3;100006=4;201062=0')
    expect(await decodeSnapshot(encoded)).toEqual(snapshot)
  })

  it('copies only allowed fields and remains independent of the source', async () => {
    const source = {
      ...snapshot,
      cards: [[200348, 3]] as [number, number][],
      id: 'private-id',
      user: { token: 'secret' },
    }
    const encoded = await encodeSnapshot(source)
    source.cards[0][1] = 9
    source.description = 'Changed'
    const decoded = await decodeSnapshot(encoded)
    expect(decoded.cards).toEqual([[200348, 3]])
    expect(decoded.description).toBe(snapshot.description)
    expect(Object.keys(decoded).sort()).toEqual([
      'author',
      'cards',
      'description',
      'name',
    ])
  })

  it.each([
    [[200348, -1]],
    [[200348, 1.5]],
    [[200348, '3']],
    [[0, 1]],
    [[200348.2, 1]],
    [
      [200348, 1],
      [200348, 2],
    ],
    [[200348, 1001]],
    [[200348, 1, 2]],
  ])('rejects invalid card pairs %j', (...cards) => {
    expect(() => validateSnapshot({ ...snapshot, cards })).toThrow()
  })

  it.each([
    'v1=AAAA',
    'v2=AAAA',
    '1=-1',
    '1=1.5',
    '1=2;1=3',
    '0=1',
    '1=1001',
    '1=2;',
    '1=2=3',
    '1=NaN',
    '9007199254740992=1',
  ])('rejects malformed card fragments: %s', (fragment) => {
    expect(() => decodeSnapshot(`/deck/snapshot#${fragment}`)).toThrow()
  })
  it('supports empty decks and missing metadata', () => {
    const empty = { name: '', author: '', description: '', cards: [] }
    expect(decodeSnapshot('/deck/snapshot')).toEqual(empty)
    expect(encodeSnapshot(empty)).toBe(
      '/deck/snapshot?name=&author=&description=#',
    )
    expect(decodeSnapshot(encodeSnapshot(empty))).toEqual(empty)
  })
  it('preserves reserved characters without double decoding', () => {
    const data = { ...snapshot, description: '& # + % = %20\n\n' }
    expect(decodeSnapshot(encodeSnapshot(data))).toEqual(data)
  })
  it('rejects oversized URLs and decoded payloads without truncation', () => {
    expect(() =>
      encodeSnapshot({
        ...snapshot,
        description: 'x'.repeat(SNAPSHOT_MAX_BYTES),
      }),
    ).toThrow()
    expect(() =>
      encodeSnapshot({ ...snapshot, description: '%'.repeat(45000) }),
    ).toThrow()
    expect(() =>
      decodeSnapshot(
        '/deck/snapshot?description=' + 'x'.repeat(SNAPSHOT_MAX_URL),
      ),
    ).toThrow()
    expect(() =>
      decodeSnapshot('/deck/snapshot?description=' + '%00'.repeat(43700)),
    ).toThrow()
  })
  it('retains card-count and total-quantity bounds', () => {
    expect(() =>
      encodeSnapshot({
        ...snapshot,
        cards: Array.from({ length: 2001 }, (_, i) => [i + 1, 0]),
      }),
    ).toThrow()
    expect(() =>
      encodeSnapshot({
        ...snapshot,
        cards: Array.from({ length: 11 }, (_, i) => [i + 1, 1000]),
      }),
    ).toThrow()
  })
})
