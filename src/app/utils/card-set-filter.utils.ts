import { getSetAbbrev } from './vtes-utils'

export interface SetSelection {
  sets: string[]
  notSets: string[]
}

export function normalizeSetSelection(
  sets: readonly string[] = [],
  notSets: readonly string[] = [],
): SetSelection {
  const normalizedNotSets = [
    ...new Set(notSets.map((set) => set.trim()).filter(Boolean)),
  ].sort()
  const normalizedSets = [
    ...new Set(sets.map((set) => set.trim()).filter(Boolean)),
  ]
    .filter((set) => !normalizedNotSets.includes(set))
    .sort()
  return { sets: normalizedSets, notSets: normalizedNotSets }
}

export function matchesSetSelection(
  cardSets: readonly string[],
  sets: readonly string[] = [],
  notSets: readonly string[] = [],
): boolean {
  const cardSetAbbrevs = cardSets.map(getSetAbbrev)
  if (notSets.some((set) => cardSetAbbrevs.includes(set))) {
    return false
  }
  return sets.length === 0 || sets.some((set) => cardSetAbbrevs.includes(set))
}
