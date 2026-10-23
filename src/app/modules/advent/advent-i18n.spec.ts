import { describe, expect, it } from 'vitest'
import en from '../../../assets/i18n/advent/en.json'
import es from '../../../assets/i18n/advent/es.json'
import fr from '../../../assets/i18n/advent/fr.json'
import pt from '../../../assets/i18n/advent/pt.json'
import { ADVENT_DATA } from './advent.data'

function flatten(
  value: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') {
      result[path] = child
    } else {
      Object.assign(result, flatten(child as Record<string, unknown>, path))
    }
  }
  return result
}

describe('Advent translation catalogs', () => {
  it.each(Object.entries({ en, es, fr, pt }))(
    'covers both calendars and preserves requirements and placeholders in %s',
    (_language, locale) => {
      const reference = flatten(en)
      const translated = flatten(locale)
      expect(Object.keys(translated).sort()).toEqual(
        Object.keys(reference).sort(),
      )
      for (const [key, value] of Object.entries(translated)) {
        expect(value.trim(), key).not.toBe('')
        expect(value.match(/{{\s*\w+\s*}}/g) ?? [], key).toEqual(
          reference[key].match(/{{\s*\w+\s*}}/g) ?? [],
        )
      }
      for (const edition of ADVENT_DATA) {
        for (const day of Object.keys(edition.days)) {
          const key = `editions.${edition.year}.days.${day}`
          expect(translated[key + '.title']).toBeTruthy()
          expect(translated[key + '.content']).toBeTruthy()
          expect(translated[key + '.content'].match(/\d+/g) ?? []).toEqual(
            reference[key + '.content'].match(/\d+/g) ?? [],
          )
        }
      }
    },
  )
})
