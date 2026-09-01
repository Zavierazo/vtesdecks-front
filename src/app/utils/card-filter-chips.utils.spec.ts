import { CryptFilter, LibraryFilter } from '@models'
import { FilterChip } from '@shared/components/filter-chips/filter-chips.component'
import { describe, expect, it } from 'vitest'
import {
  buildCryptFilterChips,
  buildLibraryFilterChips,
  removeCardFilterChip,
} from './card-filter-chips.utils'

/** Marks translated keys so a missing translation is visible in assertions. */
const t = (key: string) => `[${key}]`

const cryptDefaults: CryptFilter = {
  name: '',
  clans: [],
  notClans: [],
  disciplines: [],
  superiorDisciplines: [],
  notDisciplines: [],
  disciplineMode: 'and',
  groupSlider: [1, 7],
  capacitySlider: [1, 11],
  advanced: undefined,
  title: '',
  sect: '',
  paths: [],
  notPaths: [],
  set: '',
  taints: [],
  cardText: '',
  artist: '',
}

const libraryDefaults: LibraryFilter = {
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
  convictionCostSlider: [0, 4],
  trifle: undefined,
  title: '',
  sect: '',
  paths: [],
  notPaths: [],
  set: '',
  taints: [],
  cardText: '',
  artist: '',
}

const chipFor = (chips: FilterChip[], key: string) =>
  chips.find((chip) => chip.key === key)

describe('buildCryptFilterChips', () => {
  it('uses the shop display name in the availability chip', () => {
    const chips = buildCryptFilterChips(
      { ...cryptDefaults, shop: 'DTC' },
      { ...cryptDefaults, shop: '' },
      t,
      (platform) => (platform === 'DTC' ? 'DriveThruCards' : platform),
    )
    expect(chipFor(chips, 'shop')).toEqual({
      id: 'shop',
      key: 'shop',
      label: '[crypt_builder_filter.shop_availability]',
      value: 'DriveThruCards',
    })
  })

  it('does not chip the advanced filter while it is Any', () => {
    const chips = buildCryptFilterChips(cryptDefaults, cryptDefaults, t)
    expect(chipFor(chips, 'advanced')).toBeUndefined()
  })

  it('chips the advanced filter with its translated value', () => {
    const chips = buildCryptFilterChips(
      { ...cryptDefaults, advanced: 'advanced' },
      cryptDefaults,
      t,
    )
    expect(chipFor(chips, 'advanced')).toEqual({
      id: 'advanced',
      key: 'advanced',
      label: '[crypt_builder_filter.version]',
      value: '[crypt_builder_filter.advanced_advanced]',
    })
  })

  it('labels the any and no title sentinels', () => {
    expect(
      chipFor(
        buildCryptFilterChips(
          { ...cryptDefaults, title: 'any' },
          cryptDefaults,
          t,
        ),
        'title',
      )?.value,
    ).toBe('[shared.any_title]')
    expect(
      chipFor(
        buildCryptFilterChips(
          { ...cryptDefaults, title: 'none' },
          cryptDefaults,
          t,
        ),
        'title',
      )?.value,
    ).toBe('[shared.no_title]')
  })

  it('keeps rendering a specific title as is', () => {
    expect(
      chipFor(
        buildCryptFilterChips(
          { ...cryptDefaults, title: 'prince' },
          cryptDefaults,
          t,
        ),
        'title',
      )?.value,
    ).toBe('prince')
  })

  it('creates one chip per selected or excluded path', () => {
    const chips = buildCryptFilterChips(
      {
        ...cryptDefaults,
        paths: ['Caine', 'Cathari'],
        notPaths: ['Power and the Inner Voice'],
      },
      cryptDefaults,
      t,
    )

    expect(chips.filter((chip) => chip.key === 'paths')).toEqual([
      {
        id: 'paths:Caine',
        key: 'paths',
        item: 'Caine',
        label: '[crypt_builder_filter.path]',
        value: '[vtes.path.caine]',
      },
      {
        id: 'paths:Cathari',
        key: 'paths',
        item: 'Cathari',
        label: '[crypt_builder_filter.path]',
        value: '[vtes.path.cathari]',
      },
    ])
    expect(chipFor(chips, 'notPaths')).toEqual({
      id: 'notPaths:Power and the Inner Voice',
      key: 'notPaths',
      item: 'Power and the Inner Voice',
      label: '[crypt_builder_filter.not_paths]',
      value: '[vtes.path.power]',
    })
  })

  it('labels the no-path sentinel as not required', () => {
    const chips = buildCryptFilterChips(
      { ...cryptDefaults, paths: ['none'] },
      cryptDefaults,
      t,
    )

    expect(chipFor(chips, 'paths')?.value).toBe('[shared.not_required]')
  })
})

describe('buildLibraryFilterChips', () => {
  it('skips the conviction cost chip while the range is the default', () => {
    const chips = buildLibraryFilterChips(libraryDefaults, libraryDefaults, t)
    expect(chipFor(chips, 'convictionCostSlider')).toBeUndefined()
    expect(chipFor(chips, 'trifle')).toBeUndefined()
  })

  it('chips a narrowed conviction cost range', () => {
    const chips = buildLibraryFilterChips(
      { ...libraryDefaults, convictionCostSlider: [1, 2] },
      libraryDefaults,
      t,
    )
    expect(chipFor(chips, 'convictionCostSlider')?.value).toBe('1–2')
  })

  it('chips the trifle filter with its translated value', () => {
    const chips = buildLibraryFilterChips(
      { ...libraryDefaults, trifle: 'non_trifle' },
      libraryDefaults,
      t,
    )
    expect(chipFor(chips, 'trifle')?.value).toBe(
      '[library_builder_filter.trifle_non]',
    )
  })
})

describe('removeCardFilterChip', () => {
  it('resets the new crypt and library filters to their defaults', () => {
    const [advancedChip] = buildCryptFilterChips(
      { ...cryptDefaults, advanced: 'base' },
      cryptDefaults,
      t,
    ).filter((chip) => chip.key === 'advanced')
    expect(
      removeCardFilterChip(
        { ...cryptDefaults, advanced: 'base' },
        cryptDefaults,
        advancedChip,
      ).advanced,
    ).toBeUndefined()

    const filter: LibraryFilter = {
      ...libraryDefaults,
      trifle: 'trifle',
      convictionCostSlider: [2, 3],
    }
    const chips = buildLibraryFilterChips(filter, libraryDefaults, t)
    const cleared = removeCardFilterChip(
      removeCardFilterChip(filter, libraryDefaults, chipFor(chips, 'trifle')!),
      libraryDefaults,
      chipFor(chips, 'convictionCostSlider')!,
    )
    expect(cleared.trifle).toBeUndefined()
    expect(cleared.convictionCostSlider).toEqual([0, 4])
  })
})
