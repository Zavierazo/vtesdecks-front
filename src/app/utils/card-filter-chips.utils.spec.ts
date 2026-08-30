import { CryptFilter, LibraryFilter } from '@models'
import { describe, expect, it } from 'vitest'
import {
  buildCryptFilterChips,
  buildLibraryFilterChips,
  removeCardFilterChip,
} from './card-filter-chips.utils'

// The real translations are exercised in the app; here the key is enough.
const t = (key: string) => key

const cryptDefaults = (): CryptFilter => ({
  name: '',
  clans: [],
  notClans: [],
  disciplines: [],
  superiorDisciplines: [],
  notDisciplines: [],
  disciplineMode: 'and',
  groupSlider: [1, 7],
  capacitySlider: [1, 11],
  title: '',
  sect: '',
  path: '',
  set: '',
  taints: [],
  cardText: '',
  artist: '',
  printOnDemand: false,
})

const libraryDefaults = (): LibraryFilter => ({
  name: '',
  types: [],
  notTypes: [],
  typeMode: 'or',
  clans: [],
  notClans: [],
  disciplines: [],
  notDisciplines: [],
  disciplineMode: 'and',
  bloodCostSlider: [0, 4],
  poolCostSlider: [0, 6],
  title: '',
  sect: '',
  path: '',
  set: '',
  taints: [],
  cardText: '',
  artist: '',
  printOnDemand: false,
})

describe('buildCryptFilterChips', () => {
  it('has no chips for an untouched filter', () => {
    expect(buildCryptFilterChips(cryptDefaults(), cryptDefaults(), t)).toEqual(
      [],
    )
  })

  it('ignores the name, which has its own header input', () => {
    const filter = { ...cryptDefaults(), name: 'Victoria' }
    expect(buildCryptFilterChips(filter, cryptDefaults(), t)).toEqual([])
  })

  it('emits one chip per value of a multi-value filter', () => {
    const filter = { ...cryptDefaults(), clans: ['Toreador', 'Brujah'] }
    const chips = buildCryptFilterChips(filter, cryptDefaults(), t)
    expect(chips).toHaveLength(2)
    expect(chips.map((chip) => chip.value)).toEqual(['Toreador', 'Brujah'])
    expect(chips.every((chip) => chip.key === 'clans')).toBe(true)
  })

  it('covers scalars, ranges, flags and modes', () => {
    const filter: CryptFilter = {
      ...cryptDefaults(),
      capacitySlider: [4, 6],
      sect: 'Camarilla',
      printOnDemand: true,
      disciplineMode: 'or',
    }
    const chips = buildCryptFilterChips(filter, cryptDefaults(), t)
    expect(chips.map((chip) => [chip.key, chip.value])).toEqual([
      ['printOnDemand', undefined],
      ['disciplineMode', undefined],
      ['capacitySlider', '4–6'],
      ['sect', 'Camarilla'],
    ])
  })

  it('skips a range that still matches its default', () => {
    const filter = { ...cryptDefaults(), groupSlider: [1, 7] }
    expect(buildCryptFilterChips(filter, cryptDefaults(), t)).toEqual([])
  })
})

describe('buildLibraryFilterChips', () => {
  it('has no chips for an untouched filter', () => {
    expect(
      buildLibraryFilterChips(libraryDefaults(), libraryDefaults(), t),
    ).toEqual([])
  })

  it('chips the type list and the blood cost range', () => {
    const filter: LibraryFilter = {
      ...libraryDefaults(),
      types: ['Action', 'Combat'],
      bloodCostSlider: [1, 3],
    }
    const chips = buildLibraryFilterChips(filter, libraryDefaults(), t)
    expect(chips.map((chip) => [chip.key, chip.value])).toEqual([
      ['types', 'Action'],
      ['types', 'Combat'],
      ['bloodCostSlider', '1–3'],
    ])
  })
})

describe('removeCardFilterChip', () => {
  it('drops a single value and keeps the rest of the list', () => {
    const filter = { ...cryptDefaults(), clans: ['Toreador', 'Brujah'] }
    const chips = buildCryptFilterChips(filter, cryptDefaults(), t)
    const result = removeCardFilterChip(filter, cryptDefaults(), chips[1])
    expect(result.clans).toEqual(['Toreador'])
  })

  it('restores the default for a single-value filter', () => {
    const filter = { ...cryptDefaults(), capacitySlider: [4, 6] }
    const [chip] = buildCryptFilterChips(filter, cryptDefaults(), t)
    const result = removeCardFilterChip(filter, cryptDefaults(), chip)
    expect(result.capacitySlider).toEqual([1, 11])
  })

  it('leaves the other filters untouched', () => {
    const filter = {
      ...cryptDefaults(),
      clans: ['Toreador'],
      sect: 'Camarilla',
    }
    const chips = buildCryptFilterChips(filter, cryptDefaults(), t)
    const result = removeCardFilterChip(filter, cryptDefaults(), chips[0])
    expect(result.clans).toEqual([])
    expect(result.sect).toBe('Camarilla')
  })
})
