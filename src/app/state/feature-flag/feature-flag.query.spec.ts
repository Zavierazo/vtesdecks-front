import { TestBed } from '@angular/core/testing'
import { ApiFeatureFlag } from '@models'
import { describe, expect, it } from 'vitest'
import { FeatureFlagQuery } from './feature-flag.query'
import { FeatureFlagStore } from './feature-flag.store'

const FLAGS: ApiFeatureFlag[] = [
  { key: 'bool_on', type: 'BOOLEAN', value: true },
  { key: 'bool_off', type: 'BOOLEAN', value: false },
  { key: 'text', type: 'STRING', value: 'hello' },
  { key: 'list', type: 'LIST', value: ['a', 'b'] },
  { key: 'broken_bool', type: 'BOOLEAN', value: 'true' },
  { key: 'broken_list', type: 'LIST', value: 'not-a-list' },
]

describe('FeatureFlagQuery', () => {
  function setup(flags: ApiFeatureFlag[] = FLAGS): FeatureFlagQuery {
    TestBed.configureTestingModule({})
    TestBed.inject(FeatureFlagStore).setFlags(flags)
    return TestBed.inject(FeatureFlagQuery)
  }

  it('isEnabled returns true only for enabled boolean flags', () => {
    const query = setup()
    expect(query.isEnabled('bool_on')).toBe(true)
    expect(query.isEnabled('bool_off')).toBe(false)
  })

  it('isEnabled returns false for missing keys', () => {
    const query = setup()
    expect(query.isEnabled('missing')).toBe(false)
  })

  it('isEnabled returns false when the value does not match the type', () => {
    const query = setup()
    expect(query.isEnabled('broken_bool')).toBe(false)
    expect(query.isEnabled('text')).toBe(false)
  })

  it('getString returns the value for string flags and undefined otherwise', () => {
    const query = setup()
    expect(query.getString('text')).toBe('hello')
    expect(query.getString('missing')).toBeUndefined()
    expect(query.getString('bool_on')).toBeUndefined()
  })

  it('getList returns the value for list flags and empty array otherwise', () => {
    const query = setup()
    expect(query.getList('list')).toEqual(['a', 'b'])
    expect(query.getList('missing')).toEqual([])
    expect(query.getList('broken_list')).toEqual([])
  })

  it('selectEnabled emits when a flag flips', () => {
    const query = setup()
    const emissions: boolean[] = []
    query.selectEnabled('bool_off').subscribe((value) => emissions.push(value))
    TestBed.tick()
    expect(emissions).toEqual([false])

    TestBed.inject(FeatureFlagStore).setFlag({
      key: 'bool_off',
      type: 'BOOLEAN',
      value: true,
    })
    TestBed.tick()
    expect(emissions).toEqual([false, true])
  })

  it('selectAll returns all flags', () => {
    const query = setup()
    let all: ApiFeatureFlag[] = []
    query.selectAll().subscribe((flags) => (all = flags))
    TestBed.tick()
    expect(all.length).toBe(FLAGS.length)
  })
})
