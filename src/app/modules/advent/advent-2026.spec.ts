import { describe, expect, it } from 'vitest'
import { ApiCrypt, ApiLibrary } from '@models'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { ADVENT_2026, matchesRelease } from './advent-2026.data'
import { ADVENT_DATA } from './advent.data'
import { getCurrentAdventData } from '../../utils/advent-utils'

const validateAdvent2026Day = (day: number, query: DeckBuilderQuery) =>
  ADVENT_2026.days[day].validation!(query)

function query(
  crypt: (Partial<ApiCrypt> & { number: number })[],
  library: (Partial<ApiLibrary> & { number: number })[] = [],
) {
  const rows = [...crypt, ...library]
  return {
    getCrypt: () => crypt.map((card) => ({ type: 'Vampire', ...card })),
    getLibrary: () => library,
    getCryptSize: () =>
      crypt.reduce((sum, card) => sum + Math.max(0, card.number), 0),
    getCardNumber: (id: number) =>
      rows.find((card) => card.id === id)?.number ?? 0,
  } as unknown as DeckBuilderQuery
}

describe('Advent 2026 challenge rules', () => {
  it('registers all 24 days and preserves the previous calendar', () => {
    expect(Object.keys(ADVENT_2026.days)).toHaveLength(24)
    expect(
      ADVENT_DATA.find((event) => event.year === 2025)?.days[24],
    ).toBeDefined()
    expect(
      [2, 6, 10].map((day) => ADVENT_2026.days[day].releasePercentage),
    ).toEqual([50, 50, 50])
    expect(
      [14, 18].map((day) => ADVENT_2026.days[day].releasePercentage),
    ).toEqual([25, 25])
    expect(
      [3, 7, 11, 15, 19, 22].map((day) => ADVENT_2026.days[day].archetypeId),
    ).toEqual([1, 3, 12, 106, 128, 142])
  })

  it.each([
    [50, 102, 51],
    [50, 103, 52],
    [25, 102, 26],
    [25, 103, 26],
  ])('rounds %i%% of %i copies up to %i', (percentage, total, required) => {
    const release = new Set([200001, 100001])
    const cards = (count: number) => [
      { id: 200001, number: 12 },
      { id: 100001, number: count - 12 },
      { id: 100002, number: total - count },
      { id: 100003, number: 0 },
    ]
    expect(matchesRelease(cards(required), release, percentage)).toBe(true)
    expect(matchesRelease(cards(required - 1), release, percentage)).toBe(false)
    expect(matchesRelease([], release, percentage)).toBe(false)
  })

  it('weights crypt copies and ignores considering vampires and Imbued clans', () => {
    const crypt = [
      { id: 1, number: 9, clan: 'Gangrel', sect: 'Anarch' },
      { id: 2, number: 3, clan: 'Toreador' },
    ]
    expect(validateAdvent2026Day(1, query(crypt))).toEqual({})
    expect(validateAdvent2026Day(9, query(crypt))).toEqual({})
    crypt[0].number = 8
    crypt[1].number = 4
    expect(validateAdvent2026Day(1, query(crypt)).libraryErrors).toBeDefined()
    expect(validateAdvent2026Day(9, query(crypt)).libraryErrors).toBeDefined()
    expect(
      validateAdvent2026Day(
        16,
        query([
          { id: 1, number: 12, clan: 'Gangrel' },
          { id: 2, number: 0, clan: 'Toreador' },
        ]),
      ).libraryErrors,
    ).toBeDefined()
    expect(
      validateAdvent2026Day(
        16,
        query([
          { id: 1, number: 12, clan: 'Gangrel' },
          { id: 2, number: 1, clan: 'Avenger', type: 'Imbued' },
        ]),
      ).libraryErrors,
    ).toBeDefined()
    expect(validateAdvent2026Day(16, query(crypt))).toEqual({})
  })

  it.each([
    [5, 'Political Action', 8],
    [8, 'Ally', 6],
    [13, 'Equipment', 4],
    [17, 'Combat', 18],
    [21, 'Retainer', 3],
  ] as const)(
    'counts copies and hybrid card types for day %i',
    (day, type, minimum) => {
      const library = [
        { id: 1, number: minimum - 1, types: [type, 'Action'] },
        { id: 2, number: 0, types: [type] },
      ]
      expect(
        validateAdvent2026Day(day, query([], library)).libraryErrors,
      ).toBeDefined()
      library[0].number++
      expect(validateAdvent2026Day(day, query([], library))).toEqual({})
    },
  )

  it('requires a real star and rounds half-crypt capacity thresholds up', () => {
    expect(
      validateAdvent2026Day(
        4,
        query([
          { id: 1, number: 2 },
          { id: 2, number: 2 },
        ]),
      ).libraryErrors,
    ).toBeDefined()
    expect(validateAdvent2026Day(4, query([{ id: 1, number: 3 }]))).toEqual({})
    const crypt = [
      { id: 1, number: 6, capacity: 8 },
      { id: 2, number: 7, capacity: 5 },
    ]
    expect(validateAdvent2026Day(12, query(crypt)).libraryErrors).toBeDefined()
    expect(validateAdvent2026Day(20, query(crypt))).toEqual({})
    crypt[0].number = 7
    crypt[1].number = 6
    expect(validateAdvent2026Day(12, query(crypt))).toEqual({})
    expect(validateAdvent2026Day(20, query(crypt)).libraryErrors).toBeDefined()
  })

  it('requires the same discipline in both sections without double counting superior levels', () => {
    const crypt = [
      {
        id: 1,
        number: 6,
        disciplines: ['Dominate'],
        superiorDisciplines: ['Dominate'],
      },
      { id: 2, number: 6, disciplines: ['Auspex'] },
    ]
    const library = [
      {
        id: 3,
        number: 10,
        types: ['Action'],
        disciplines: ['Dominate', 'Obfuscate'],
      },
    ]
    expect(
      validateAdvent2026Day(23, query(crypt, library)).libraryErrors,
    ).toBeDefined()
    crypt[0].number = 9
    crypt[1].number = 3
    expect(validateAdvent2026Day(23, query(crypt, library))).toEqual({})
    library[0].number = 9
    expect(
      validateAdvent2026Day(23, query(crypt, library)).libraryErrors,
    ).toBeDefined()
  })

  it('leaves day 24 unrestricted and keeps the event open for all of December 31', () => {
    expect(validateAdvent2026Day(24, query([]))).toEqual({})
    expect(ADVENT_2026.days[24].archetypeId).toBeUndefined()
    expect(ADVENT_2026.days[24].releaseDeckId).toBeUndefined()
    expect(getCurrentAdventData(new Date('2026-11-30T23:59:59Z'))).toBeNull()
    expect(
      getCurrentAdventData(new Date('2026-12-31T23:59:59.999Z'))?.year,
    ).toBe(2026)
    expect(getCurrentAdventData(new Date('2027-01-01T00:00:00Z'))).toBeNull()
  })
})
