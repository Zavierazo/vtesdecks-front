import { DeckSnapshot } from '../models/deck-snapshot'

export const SNAPSHOT_MAX_URL = 128 * 1024
export const SNAPSHOT_MAX_BYTES = 256 * 1024

export function validateSnapshot(value: unknown): DeckSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid snapshot')
  }
  const data = value as Record<string, unknown>
  if (
    typeof data['name'] !== 'string' ||
    typeof data['author'] !== 'string' ||
    typeof data['description'] !== 'string' ||
    !Array.isArray(data['cards']) ||
    data['cards'].length > 2000
  ) {
    throw new Error('Invalid snapshot')
  }
  const seen = new Set<number>()
  let total = 0
  const cards: DeckSnapshot['cards'] = data['cards'].map((pair: unknown) => {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      !Number.isSafeInteger(pair[0]) ||
      pair[0] <= 0 ||
      !Number.isSafeInteger(pair[1]) ||
      pair[1] < 0 ||
      pair[1] > 1000 ||
      seen.has(pair[0])
    ) {
      throw new Error('Invalid snapshot cards')
    }
    seen.add(pair[0])
    total += pair[1]
    return [pair[0], pair[1]]
  })
  if (total > 10000) {
    throw new Error('Snapshot too large')
  }
  return {
    name: data['name'],
    author: data['author'],
    description: data['description'],
    cards,
  }
}

function checkPayloadSize(snapshot: DeckSnapshot): DeckSnapshot {
  if (
    new TextEncoder().encode(JSON.stringify(snapshot)).length >
    SNAPSHOT_MAX_BYTES
  ) {
    throw new Error('Snapshot too large')
  }
  return snapshot
}

/** Returns a relative URL, including the metadata query and card fragment. */
export function encodeSnapshot(snapshot: DeckSnapshot): string {
  const data = checkPayloadSize(validateSnapshot(snapshot))
  const query = ['name', 'author', 'description']
    .map(
      (key) =>
        `${key}=${encodeURIComponent(data[key as 'name' | 'author' | 'description'])}`,
    )
    .join('&')
  const fragment = data.cards
    .map(([id, quantity]) => `${id}=${quantity}`)
    .join(';')
  const suffix = `?${query}#${fragment}`
  if (suffix.length > SNAPSHOT_MAX_URL) {
    throw new Error('Snapshot too large')
  }
  return `/deck/snapshot${suffix}`
}

/** Reads an absolute or relative snapshot URL without fetching it. */
export function decodeSnapshot(link: string): DeckSnapshot {
  const url = new URL(link, 'https://snapshot.invalid')
  if (
    url.pathname !== '/deck/snapshot' ||
    url.search.length + url.hash.length > SNAPSHOT_MAX_URL
  ) {
    throw new Error('Invalid snapshot link')
  }
  const fragment = url.hash.slice(1)
  const cards =
    fragment === ''
      ? []
      : fragment.split(';').map((pair) => {
          if (!/^[0-9]+=[0-9]+$/.test(pair)) {
            throw new Error('Invalid snapshot link')
          }
          return pair.split('=').map(Number)
        })
  return checkPayloadSize(
    validateSnapshot({
      name: url.searchParams.get('name') ?? '',
      author: url.searchParams.get('author') ?? '',
      description: url.searchParams.get('description') ?? '',
      cards,
    }),
  )
}
