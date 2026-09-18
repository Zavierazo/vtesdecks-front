import { trigramSimilarity } from './trigram-similarity'
import { isRegexSearch, normalizeText, searchIncludes } from './vtes-utils'

interface SearchableCardName {
  name: string
  aka?: string
  i18n?: { name?: string }
}

function names(card: SearchableCardName): string[] {
  return [card.name, card.i18n?.name, card.aka].filter(
    (name): name is string => !!name,
  )
}

export function matchesCardName(
  card: SearchableCardName | undefined,
  term: string,
): boolean {
  return !!card && names(card).some((name) => searchIncludes(name, term))
}

function nameWeight(card: SearchableCardName, term: string): number {
  const normalizedTerm = normalizeText(term)
  return Math.max(
    0,
    ...names(card).map((name) => {
      if (!isRegexSearch(term) && normalizedTerm) {
        const normalizedName = normalizeText(name)
        if (normalizedName === normalizedTerm) {
          return 2
        }
        if (normalizedName.includes(normalizedTerm)) {
          return 1
        }
      }
      return trigramSimilarity(name, term)
    }),
  )
}

/** Best matching name wins, with a stable canonical-name tie breaker. */
export function compareCardNames(
  a: SearchableCardName | undefined,
  b: SearchableCardName | undefined,
  term = '',
  order: 'asc' | 'desc' = 'desc',
): number {
  const difference =
    (a ? nameWeight(a, term) : 0) - (b ? nameWeight(b, term) : 0)
  if (difference !== 0) {
    return order === 'asc' ? difference : -difference
  }
  const aName = a?.name ?? ''
  const bName = b?.name ?? ''
  return aName === bName ? 0 : aName > bName ? 1 : -1
}
