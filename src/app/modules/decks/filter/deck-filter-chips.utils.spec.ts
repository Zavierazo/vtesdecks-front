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

const cryptQuery = queryStub<ApiCrypt>({
  200130: { id: 200130, name: 'Aren, Priest of Eshu' } as ApiCrypt,
})
const libraryQuery = queryStub<ApiLibrary>({
  101250: {
    id: 101250,
    name: 'Muddled Vampire Hunter',
    i18n: { name: 'Cazador de vampiros confundido' },
  } as ApiLibrary,
})

const ctx = { t, cryptQuery, libraryQuery }

describe('buildDeckFilterChips', () => {
  it('has no chips without query params', () => {
    expect(buildDeckFilterChips({}, ctx)).toEqual([])
  })

  it('ignores the header controls', () => {
    const chips = buildDeckFilterChips(
      { type: 'TOURNAMENT', order: 'POPULAR' },
      ctx,
    )
    expect(chips).toEqual([])
  })

  it('emits one chip per value of a list filter', () => {
    const chips = buildDeckFilterChips({ clans: 'Malkavian,Brujah' }, ctx)
    expect(chips.map((chip) => [chip.key, chip.item])).toEqual([
      ['clans', 'Malkavian'],
      ['clans', 'Brujah'],
    ])
  })

  it('renders rounds as tournament rounds', () => {
    const [chip] = buildDeckFilterChips({ rounds: '3' }, ctx)
    expect(chip.value).toBe('3R+F')
  })

  it('skips a range that still matches its default', () => {
    expect(buildDeckFilterChips({ librarySize: ['40', '90'] }, ctx)).toEqual([])
    expect(
      buildDeckFilterChips({ librarySize: ['50', '90'] }, ctx),
    ).toHaveLength(1)
  })

  it('names crypt cards with their count', async () => {
    const [chip] = buildDeckFilterChips({ cards: '200130=2' }, ctx)
    expect(chip.label).toBe('filters.crypt_cards')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe(
      '2x Aren, Priest of Eshu',
    )
  })

  it('prefers the localized name for library cards', async () => {
    const [chip] = buildDeckFilterChips({ cards: '101250=1' }, ctx)
    expect(chip.label).toBe('filters.library_cards')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe(
      'Cazador de vampiros confundido',
    )
  })

  it('falls back to the card id while the store is still loading', async () => {
    const [chip] = buildDeckFilterChips({ cards: '999=1' }, ctx)
    await expect(firstValueFrom(chip.value$!)).resolves.toBe('999')
  })

  it('resolves the archetype name through the injected lookup', async () => {
    const [chip] = buildDeckFilterChips(
      { archetype: '38' },
      { ...ctx, archetypeName: (id) => of(`Blind Spot #${id}`) },
    )
    expect(chip.key).toBe('archetype')
    expect(chip.label).toBe('filters.archetype')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe('Blind Spot #38')
  })

  it('chips the similarity search with the source deck name', async () => {
    const [chip] = buildDeckFilterChips(
      { bySimilarity: 'user-lordharrington-b5f28' },
      { ...ctx, deckName: () => of('Baron protean') },
    )
    expect(chip.key).toBe('bySimilarity')
    expect(chip.label).toBe('filters.similar_to')
    await expect(firstValueFrom(chip.value$!)).resolves.toBe('Baron protean')
  })

  it('gives the unclassified archetype a useful label', () => {
    const [chip] = buildDeckFilterChips({ archetype: '0' }, ctx)
    expect(chip.value).toBe('filters.unclassified')
    expect(chip.value$).toBeUndefined()
  })

  it('names excluded cards and exposes price bounds', async () => {
    const chips = buildDeckFilterChips(
      {
        excludedCards: '200130,101250',
        minPrice: '10.5',
        maxPrice: '50',
      },
      ctx,
    )
    expect(chips.map((chip) => chip.key)).toEqual([
      'minPrice',
      'maxPrice',
      'excludedCards',
      'excludedCards',
    ])
    await expect(firstValueFrom(chips[2].value$!)).resolves.toBe(
      'Aren, Priest of Eshu',
    )
  })
})

describe('removeDeckFilterChip', () => {
  it('clears a single-value param', () => {
    const params = { place: 'Madrid' }
    const [chip] = buildDeckFilterChips(params, ctx)
    expect(removeDeckFilterChip(params, chip)).toEqual({ place: undefined })
  })

  it('keeps the remaining values of a list', () => {
    const params = { clans: 'Malkavian,Brujah' }
    const chips = buildDeckFilterChips(params, ctx)
    expect(removeDeckFilterChip(params, chips[0])).toEqual({ clans: 'Brujah' })
  })

  it('keeps the remaining cards with their counts', () => {
    const params = { cards: '200130=2,101250=1' }
    const chips = buildDeckFilterChips(params, ctx)
    expect(removeDeckFilterChip(params, chips[0])).toEqual({
      cards: '101250=1',
    })
  })

  it('clears the param once the last card is removed', () => {
    const params = { cards: '200130=2' }
    const [chip] = buildDeckFilterChips(params, ctx)
    expect(removeDeckFilterChip(params, chip)).toEqual({ cards: undefined })
  })

  it('removes one excluded card without touching required cards', () => {
    const params = {
      cards: '200130=2',
      excludedCards: '200130,101250',
    }
    const chip = buildDeckFilterChips(params, ctx).find(
      (item) => item.id === 'excludedCards:200130',
    )!
    expect(removeDeckFilterChip(params, chip)).toEqual({
      excludedCards: '101250',
    })
  })
})
