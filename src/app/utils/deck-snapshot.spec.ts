import { Blob as NodeBlob } from 'node:buffer'
import { gzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeckSnapshotV1 } from '../models/deck-snapshot'
import {
  decodeSnapshot,
  encodeSnapshot,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_FRAGMENT,
  validateSnapshot,
} from './deck-snapshot'

describe('deck snapshot codec', () => {
  const snapshot: DeckSnapshotV1 = {
    name: 'Séraph 🦇',
    author: '作者',
    description: '**Hola**\n\nDescripción & #?=\n'.repeat(500),
    cards: [
      [200348, 3],
      [100006, 4],
      [201062, 0],
    ],
  }
  beforeEach(() => vi.stubGlobal('Blob', NodeBlob))
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips Unicode, Markdown, long descriptions and zero quantities through gzip', async () => {
    const encoded = await encodeSnapshot(snapshot)
    expect(encoded).toMatch(/^v1=[A-Za-z0-9_-]+$/)
    expect(encoded.length).toBeLessThan(JSON.stringify(snapshot).length)
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

  it.each(['', 'v2=AAAA', 'v1=!', 'v1=AAAA', 'v1=abc&name=other'])(
    'rejects malformed links: %s',
    async (fragment) => {
      await expect(decodeSnapshot(fragment)).rejects.toThrow()
    },
  )

  it('rejects oversized input and output without truncating', async () => {
    await expect(
      encodeSnapshot({
        ...snapshot,
        description: 'x'.repeat(SNAPSHOT_MAX_BYTES),
      }),
    ).rejects.toThrow()
    await expect(
      decodeSnapshot('v1=' + 'A'.repeat(SNAPSHOT_MAX_FRAGMENT)),
    ).rejects.toThrow()
    const bomb = gzipSync(
      JSON.stringify({
        ...snapshot,
        description: 'x'.repeat(SNAPSHOT_MAX_BYTES + 1),
      }),
    ).toString('base64url')
    await expect(decodeSnapshot('v1=' + bomb)).rejects.toThrow()
  })

  it('checks schema after decompression too', async () => {
    const fragment =
      'v1=' +
      gzipSync(JSON.stringify({ ...snapshot, cards: [[1, -1]] })).toString(
        'base64url',
      )
    await expect(decodeSnapshot(fragment)).rejects.toThrow()
  })
})
