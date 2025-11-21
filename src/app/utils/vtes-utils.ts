import { ApiCard } from '../models/api-card'
import { trigramSimilarity } from './trigram-similarity'

export function isCrypt(value: ApiCard): boolean {
  return value.id >= 200000
}

export function isCryptId(id: number): boolean {
  return id >= 200000
}

export function isLibrary(value: ApiCard): boolean {
  return value.id < 200000
}

export function isLibraryId(id: number): boolean {
  return id < 200000
}

export function roundNumber(value: number, decimals: number): number {
  if (Number.isNaN(value)) {
    return value
  }
  return Number(Math.round(Number(`${value}e${decimals}`)) + `e-${decimals}`)
}

export function isChristmas() {
  const now = new Date()
  return (
    (now.getMonth() === 11 && now.getDate() > 20) ||
    (now.getMonth() === 0 && now.getDate() < 6)
  )
}

export function isHalloween() {
  const now = new Date()
  return (
    (now.getMonth() === 9 && now.getDate() > 29) ||
    (now.getMonth() === 10 && now.getDate() < 2)
  )
}

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase() // Convert to lowercase
    .replace(/[^\w]/g, '') // Keep only word characters
    .trim()
}

export const isRegexSearch = (searchString: string): boolean => {
  return searchString.startsWith('/') && searchString.endsWith('/')
}

export const sortTrigramSimilarity = (
  a: string,
  b: string,
  searchString: string,
): number => {
  if (searchString.length < 3) {
    return a > b ? 1 : -1
  }
  const aWeight = trigramSimilarity(a, searchString)
  const bWeight = trigramSimilarity(b, searchString)
  if (aWeight === bWeight) {
    return a > b ? 1 : -1
  }
  return aWeight > bWeight ? -1 : 1
}

export const searchIncludes = (
  string: string | undefined,
  searchString: string,
): boolean => {
  if (!string) {
    return false
  }
  if (isRegexSearch(searchString)) {
    // Regex search
    try {
      const regexPattern = searchString.slice(1, -1) // Remove the slashes
      const regex = new RegExp(regexPattern, 'i') // Create a RegExp object
      return regex.test(string) // Test the regex on the string
    } catch {
      // If the regex is invalid, consider it not a match
      return false
    }
  } else {
    // Non-regex search
    const normalizedString = normalizeText(string)
    const normalizedSearchString = normalizeText(searchString)

    if (normalizedString.includes(normalizedSearchString)) {
      return true
    }
    const trigramWeight = trigramSimilarity(string, searchString)
    if (trigramWeight >= 0.25) {
      return true
    }
    return false
  }
}
