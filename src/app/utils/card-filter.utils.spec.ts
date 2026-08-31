import { CryptFilter } from '@models'
import { describe, expect, it } from 'vitest'
import { isDefaultCardFilter } from './card-filter.utils'

describe('isDefaultCardFilter', () => {
  const defaults = (): CryptFilter => ({
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
    paths: [],
    notPaths: [],
    set: '',
    taints: [],
    cardText: '',
    artist: '',
  })

  it('is true for an untouched copy of the defaults', () => {
    expect(isDefaultCardFilter(defaults(), defaults())).toBe(true)
  })

  it('is false once a clan is selected', () => {
    const filter = { ...defaults(), clans: ['Malkavian'] }
    expect(isDefaultCardFilter(filter, defaults())).toBe(false)
  })

  it('is false when a slider is narrowed', () => {
    const filter = { ...defaults(), capacitySlider: [4, 11] }
    expect(isDefaultCardFilter(filter, defaults())).toBe(false)
  })

  it('ignores the name field', () => {
    const filter = { ...defaults(), name: 'gov' }
    expect(isDefaultCardFilter(filter, defaults())).toBe(true)
  })

  it('treats empty string, undefined and false as equivalent defaults', () => {
    const filter = {
      ...defaults(),
      title: undefined,
      printOnDemand: false,
    }
    expect(isDefaultCardFilter(filter, defaults())).toBe(true)
  })

  it('is false when a limited format is selected even though defaults omit it', () => {
    const filter = { ...defaults(), predefinedLimitedFormat: 'v5' }
    expect(isDefaultCardFilter(filter, defaults())).toBe(false)
  })
})
