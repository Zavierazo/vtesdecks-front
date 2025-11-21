import { ApiDeckLimitedFormat } from '@models'
import { isCryptId, isLibraryId } from '../../../utils/vtes-utils'

export function toUrl(value: ApiDeckLimitedFormat): string {
  if (!value) {
    return ''
  }

  const name = value.name?.replaceAll('_', '---') ?? ''

  // Get sets as a dash-separated list
  const sets = Object.keys(value.sets || {}).join('-')

  // Get allowed cards as a dash-separated list
  const allowedCrypt = Object.keys(value.allowed?.crypt || {}).join('-')
  const allowedLibrary = Object.keys(value.allowed?.library || {}).join('-')
  const allowed = `${allowedCrypt}-${allowedLibrary}`

  // Get banned cards as a dash-separated list
  const bannedCrypt = Object.keys(value.banned?.crypt || {}).join('-')
  const bannedLibrary = Object.keys(value.banned?.library || {}).join('-')
  const banned = `${bannedCrypt}${bannedCrypt ? '-' : ''}${bannedLibrary}`

  // Format the URL string
  return `v1_${name}_${value.minCrypt ?? ''}_${value.maxCrypt ?? ''}_${value.minLibrary ?? ''}_${value.maxLibrary ?? ''}_${sets}_${allowed}_${banned}`
}

export function fromUrl(url: string): ApiDeckLimitedFormat | undefined {
  if (!url) {
    return undefined
  }

  // Parse the URL string
  const parts = url.split('_')
  if (parts.length !== 9) {
    return undefined
  }
  if (parts[0] == 'v1') {
    const name = parts[1].replaceAll('---', '_')
    const minCrypt = parseInt(parts[2])
    const maxCrypt = parseInt(parts[3])
    const minLibrary = parseInt(parts[4])
    const maxLibrary = parseInt(parts[5])
    const sets = parts[6].split('-').reduce((acc, set) => {
      acc[set] = true
      return acc
    }, {} as any)
    const allowedCards = parts[7].split('-')
    const allowedCrypt = allowedCards
      .filter((card) => isCryptId(parseInt(card)))
      .reduce((acc, card) => {
        acc[card] = true
        return acc
      }, {} as any)
    const allowedLibrary = allowedCards
      .filter((card) => isLibraryId(parseInt(card)))
      .reduce((acc, card) => {
        acc[card] = true
        return acc
      }, {} as any)
    const bannedCards = parts[8].split('-')
    const bannedCrypt = bannedCards
      .filter((card) => isCryptId(parseInt(card)))
      .reduce((acc, card) => {
        acc[card] = true
        return acc
      }, {} as any)
    const bannedLibrary = bannedCards
      .filter((card) => isLibraryId(parseInt(card)))
      .reduce((acc, card) => {
        acc[card] = true
        return acc
      }, {} as any)

    return {
      name,
      minCrypt,
      maxCrypt,
      minLibrary,
      maxLibrary,
      sets,
      allowed: {
        crypt: allowedCrypt,
        library: allowedLibrary,
      },
      banned: {
        crypt: bannedCrypt,
        library: bannedLibrary,
      },
    } as ApiDeckLimitedFormat
  } else {
    return undefined
  }
}
