import { TestBed } from '@angular/core/testing'
import { ApiFeatureFlag } from '@models'
import { ApiDataService } from '@services'
import { of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { FeatureFlagService } from './feature-flag.service'
import { FeatureFlagStore } from './feature-flag.store'

describe('FeatureFlagService', () => {
  function setup(apiDataService: Partial<ApiDataService>) {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiDataService, useValue: apiDataService }],
    })
    return {
      service: TestBed.inject(FeatureFlagService),
      store: TestBed.inject(FeatureFlagStore),
    }
  }

  it('load stores the fetched flags', () => {
    const flags: ApiFeatureFlag[] = [
      { key: 'bool_on', type: 'BOOLEAN', value: true },
    ]
    const { service, store } = setup({ getFeatureFlags: () => of(flags) })

    service.load()

    expect(store.getValue().loaded).toBe(true)
    expect(store.getValue().flags['bool_on']).toEqual(flags[0])
  })

  it('load degrades gracefully when the API fails', () => {
    const { service, store } = setup({
      getFeatureFlags: () => throwError(() => new Error('404')),
    })

    service.load()

    expect(store.getValue().loaded).toBe(true)
    expect(store.getValue().flags).toEqual({})
  })

  it('update stores the returned flag', () => {
    const updated: ApiFeatureFlag = {
      key: 'bool_on',
      type: 'BOOLEAN',
      value: true,
    }
    const updateFeatureFlag = vi.fn(() => of(updated))
    const { service, store } = setup({
      updateFeatureFlag: updateFeatureFlag as never,
    })

    service.update('bool_on', true).subscribe()

    expect(updateFeatureFlag).toHaveBeenCalledWith('bool_on', true)
    expect(store.getValue().flags['bool_on']).toEqual(updated)
  })
})
