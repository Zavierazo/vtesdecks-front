import { describe, expect, it } from 'vitest'
import { CountryPipe } from './country.pipe'

describe('Country names', () => {
  const pipe = new CountryPipe()

  it.each([undefined, null, '', ' '])(
    'omits a missing country (%s)',
    (code) => {
      expect(pipe.transform(code, 'en')).toBeUndefined()
    },
  )

  it('uses the active language and accepts lowercase country codes', () => {
    expect(pipe.transform('ES', 'en')).toBe('Spain')
    expect(pipe.transform('es', 'es')).toBe('España')
    expect(pipe.transform('ES', 'fr')).toBe('Espagne')
    expect(pipe.transform('ES', 'pt')).toBe('Espanha')
  })

  it('preserves an unknown or invalid code instead of breaking the offer list', () => {
    expect(pipe.transform('XX', 'en')).toBe('XX')
    expect(pipe.transform('not-a-country', 'en')).toBe('not-a-country')
  })
})
