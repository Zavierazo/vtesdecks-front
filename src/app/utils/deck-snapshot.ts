import { DeckSnapshotV1 } from '../models/deck-snapshot'

export const SNAPSHOT_MAX_FRAGMENT = 128 * 1024
export const SNAPSHOT_MAX_BYTES = 256 * 1024

export function validateSnapshot(value: unknown): DeckSnapshotV1 {
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
  const cards: DeckSnapshotV1['cards'] = data['cards'].map((pair: unknown) => {
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

async function readBounded(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new Error('Snapshot too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function encodeSnapshot(
  snapshot: DeckSnapshotV1,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify(validateSnapshot(snapshot)),
  )
  if (bytes.length > SNAPSHOT_MAX_BYTES) {
    throw new Error('Snapshot too large')
  }
  const compressed = await readBounded(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),
    SNAPSHOT_MAX_FRAGMENT,
  )
  let binary = ''
  for (const byte of compressed) {
    binary += String.fromCharCode(byte)
  }
  const fragment =
    'v1=' +
    btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (fragment.length > SNAPSHOT_MAX_FRAGMENT) {
    throw new Error('Snapshot too large')
  }
  return fragment
}

export async function decodeSnapshot(
  fragment: string,
): Promise<DeckSnapshotV1> {
  if (
    fragment.length > SNAPSHOT_MAX_FRAGMENT ||
    !/^v1=[A-Za-z0-9_-]+$/.test(fragment)
  ) {
    throw new Error('Invalid snapshot link')
  }
  const binary = atob(fragment.slice(3).replace(/-/g, '+').replace(/_/g, '/'))
  const compressed = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const bytes = await readBounded(
    new Blob([compressed])
      .stream()
      .pipeThrough(new DecompressionStream('gzip')),
    SNAPSHOT_MAX_BYTES,
  )
  return validateSnapshot(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
  )
}
