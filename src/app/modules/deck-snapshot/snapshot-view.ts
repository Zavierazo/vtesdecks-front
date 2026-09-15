import { ApiCard, ApiCrypt, ApiLibrary } from '@models'
import { isCrypt } from '@utils'
import { DeckSnapshotV1 } from '../../models/deck-snapshot'

export function snapshotView(
  snapshot: DeckSnapshotV1,
  cryptCatalog: ApiCrypt[],
  libraryCatalog: ApiLibrary[],
) {
  const cryptById = new Map(cryptCatalog.map((card) => [card.id, card]))
  const libraryById = new Map(libraryCatalog.map((card) => [card.id, card]))
  const cards: ApiCard[] = snapshot.cards.map(([id, number]) => ({
    id,
    number,
    type: cryptById.get(id)?.type ?? libraryById.get(id)?.type,
  }))
  const crypt = cards.filter(isCrypt)
  const library = cards.filter((card) => !isCrypt(card))
  const unknown = cards.filter(
    (card) => !cryptById.has(card.id) && !libraryById.has(card.id),
  )
  const capacities = crypt
    .flatMap((card) => {
      const data = cryptById.get(card.id)
      return data ? Array<number>(card.number).fill(data.capacity) : []
    })
    .sort((a, b) => a - b)
  const sum = (values: number[]) =>
    values.reduce((total, value) => total + value, 0)
  const size = (values: ApiCard[]) => sum(values.map((card) => card.number))
  const libraryCost = (key: 'poolCost' | 'bloodCost') =>
    library.reduce(
      (total, card) =>
        total + Math.max(0, libraryById.get(card.id)?.[key] ?? 0) * card.number,
      0,
    )
  return {
    cards,
    crypt,
    library,
    unknown,
    cryptById,
    libraryById,
    knownCrypt: crypt.filter((card) => cryptById.has(card.id)),
    knownLibrary: library.filter((card) => libraryById.has(card.id)),
    cryptSize: size(crypt),
    librarySize: size(library),
    minCrypt: sum(capacities.slice(0, 4)),
    maxCrypt: sum(capacities.slice(-4)),
    avgCrypt: capacities.length
      ? Math.round((sum(capacities) / capacities.length) * 100) / 100
      : 0,
    poolCost: libraryCost('poolCost'),
    bloodCost: libraryCost('bloodCost'),
  }
}

export type SnapshotView = ReturnType<typeof snapshotView>
