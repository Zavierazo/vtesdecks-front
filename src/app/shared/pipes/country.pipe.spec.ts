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

  it.each([
    ['AF', 'Africa'],
    ['AN', 'Antarctica'],
    ['AS', 'Asia'],
    ['EU', 'Europe'],
    ['NA', 'North America'],
    ['OC', 'Oceania'],
    ['SA', 'South America'],
  ])('resolves continent %s separately from country codes', (code, name) => {
    expect(pipe.transform(code, 'en', 'continent')).toBe(name)
  })

  it('localizes continent names in all supported languages', () => {
    expect(pipe.transform(' eu ', 'es', 'continent')).toBe('Europa')
    expect(pipe.transform('NA', 'fr', 'continent')).toBe('Amérique du Nord')
    expect(pipe.transform('SA', 'pt', 'continent')).toBe('América do Sul')
    expect(pipe.transform('NA', 'en')).toBe('Namibia')
  })

  it('preserves unknown continent codes without interpreting them as countries', () => {
    expect(pipe.transform(' us ', 'en', 'continent')).toBe('US')
  })
})
