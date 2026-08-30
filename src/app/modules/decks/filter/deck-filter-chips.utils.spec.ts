import { ApiCrypt, ApiLibrary } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { firstValueFrom, of } from 'rxjs'
import { describe, expect, it } from 'vitest'
import {
  buildDeckFilterChips,
  removeDeckFilterChip,
} from './deck-filter-chips.utils'

const t = (key: string) => key

const queryStub = <T>(entities: Record<number, T>) =>
  ({
    hasEntity: (id: number) => entities[id] !== undefined,
    selectEntity: (id: number) => of(entities[id]),
  }) as unknown as CryptQuery & LibraryQuery

const crypt = queryStub<ApiCrypt>({
  200130: { id: 200130, name: 'Aren, Priest of Eshu' } as ApiCrypt,
})
const library = queryStub<ApiLibrary>({
  101250: {
    id: 101250,
    name: 'Muddled Vampire Hunter',
    i18n: { name: 'Cazador de vampiros confundido' },
  } as ApiLibrary,
})

describe('buildDeckFilterChips', () => {
  it('has no chips without query params', () => {
    expect(buildDeckFilterChips({}, t, crypt, library)).toEqual([])
  })

  it('ignores the header controls', () => {
    const chips = buildDeckFilterChips(
      { type: 'TOURNAMENT', order: 'POPULAR' },
      t,
      crypt,
      library,
    )
    expect(chips).toEqual([])
  })

  it('emits one chip per value of a list filter', () => {
    const chips = buildDeckFilterChips(
      { clans: 'Malkavian,Brujah' },
      t,
      crypt,
      library,
    )
    expect(chips.map((chip) => [chip.key, chip.item])).toEqual([
      ['clans', 'Malkavian'],
      ['clans', 'Brujah'],
    ])
  })

  it('renders rounds as tournament rounds', () => {
    const [chip] = buildDeckFilterChips({ rounds: '3' }, t, crypt, library)
    expect(chip.value).toBe('3R+F')
  })

  it('skips a range that still matches its default', () => {
    expect(
      buildDeckFilterChips({ librarySize: ['40', '90'] }, t, crypt, library),
    ).toEqual([])
    expect(
      buildDeckFilterChips({ librarySize: ['50', '90'] }, t, crypt, library),
    ).toHaveLength(1)
  })

  it('names crypt cards with their count', async () => {
    const [chip] = buildDeckFilterChips(
      { cards: '200130=2' },
      t,
      crypt,
      library,
    )
    expect(chip.label).toBe('filters.crypt_cards')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe(
      '2x Aren, Priest of Eshu',
    )
  })

  it('prefers the localized name for library cards', async () => {
    const [chip] = buildDeckFilterChips(
      { cards: '101250=1' },
      t,
      crypt,
      library,
    )
    expect(chip.label).toBe('filters.library_cards')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe(
      'Cazador de vampiros confundido',
    )
  })

  it('falls back to the card id while the store is still loading', async () => {
    const [chip] = buildDeckFilterChips({ cards: '999=1' }, t, crypt, library)
    await expect(firstValueFrom(chip.value$!)).resolves.toBe('999')
  })
})

describe('removeDeckFilterChip', () => {
  it('clears a single-value param', () => {
    const params = { place: 'Madrid' }
    const [chip] = buildDeckFilterChips(params, t, crypt, library)
    expect(removeDeckFilterChip(params, chip)).toEqual({ place: undefined })
  })

  it('keeps the remaining values of a list', () => {
    const params = { clans: 'Malkavian,Brujah' }
    const chips = buildDeckFilterChips(params, t, crypt, library)
    expect(removeDeckFilterChip(params, chips[0])).toEqual({ clans: 'Brujah' })
  })

  it('keeps the remaining cards with their counts', () => {
    const params = { cards: '200130=2,101250=1' }
    const chips = buildDeckFilterChips(params, t, crypt, library)
    expect(removeDeckFilterChip(params, chips[0])).toEqual({
      cards: '101250=1',
    })
  })

  it('clears the param once the last card is removed', () => {
    const params = { cards: '200130=2' }
    const [chip] = buildDeckFilterChips(params, t, crypt, library)
    expect(removeDeckFilterChip(params, chip)).toEqual({ cards: undefined })
  })
})
