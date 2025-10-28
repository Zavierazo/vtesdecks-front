import { ApiCard } from '../models/api-card'

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

const normalizeText = (text: string): string => {
  return text
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase() // Convert to lowercase
    .replace(/[^\w]/g, '') // Keep only word characters
    .trim()
}

export const searchIncludes = (
  string: string,
  searchString: string,
): boolean => {
  if (searchString.startsWith('/') && searchString.endsWith('/')) {
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

    return normalizedString.includes(normalizedSearchString)
  }
}
