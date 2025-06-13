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

export const searchIncludes = (
  string: string,
  searchString: string,
): boolean => {
  const collator = new Intl.Collator('en', { sensitivity: 'base' })
  const searchStringLength = searchString.length
  const lengthDiff = string.length - searchString.length
  for (let i = 0; i <= lengthDiff; i++) {
    if (
      collator.compare(
        string.substring(i, i + searchStringLength),
        searchString,
      ) === 0
    ) {
      return true
    }
  }
  return false
}
