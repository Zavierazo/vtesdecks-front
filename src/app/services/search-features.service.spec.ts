import { TestBed } from '@angular/core/testing'
import { ApiSearchPreset, SavedSearchPreset } from '@models'
import { AuthQuery } from '@state/auth/auth.query'
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs'
import { LocalStorageService } from './local-storage.service'
import { SearchFeaturesService } from './search-features.service'
import { SearchPresetApiDataService } from './search-preset-api.data.service'

describe('SearchFeaturesService', () => {
  let service: SearchFeaturesService
  let values: Map<string, unknown>
  let user$: BehaviorSubject<string | undefined>
  let authenticated: boolean
  let api: {
    list: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    merge: ReturnType<typeof vi.fn>
  }

  const take = <T>(observable: Observable<T>): T => {
    let value!: T
    observable.subscribe((next) => (value = next))
    return value
  }

  const configure = (
    initial: unknown = null,
    options: { user?: string; apiList?: Observable<ApiSearchPreset[]> } = {},
  ) => {
    values = new Map()
    if (initial !== null) values.set(SearchFeaturesService.STORAGE_KEY, initial)
    user$ = new BehaviorSubject<string | undefined>(options.user)
    authenticated = Boolean(options.user)
    api = {
      list: vi.fn(() => options.apiList ?? of([])),
      create: vi.fn((preset: ApiSearchPreset) => of({ ...preset, id: 1 })),
      update: vi.fn((id: number, preset: ApiSearchPreset) =>
        of({ ...preset, id }),
      ),
      delete: vi.fn(() => of(true)),
      merge: vi.fn((presets: ApiSearchPreset[]) =>
        of(presets.map((preset, index) => ({ ...preset, id: index + 1 }))),
      ),
    }
    TestBed.configureTestingModule({
      providers: [
        SearchFeaturesService,
        {
          provide: LocalStorageService,
          useValue: {
            getValue: vi.fn((key: string) => values.get(key) ?? null),
            setValue: vi.fn((key: string, value: unknown) =>
              values.set(key, value),
            ),
            clearValue: vi.fn((key: string) => values.delete(key)),
          },
        },
        {
          provide: AuthQuery,
          useValue: {
            selectUser: () => user$,
            isAuthenticated: () => authenticated,
          },
        },
        { provide: SearchPresetApiDataService, useValue: api },
      ],
    })
    service = TestBed.inject(SearchFeaturesService)
  }

  afterEach(() => TestBed.resetTestingModule())

  it('starts safely when storage is corrupt or has an unsupported version', () => {
    configure({ version: 99, presets: 'invalid', history: [] })
    expect(service.getPresets('crypt')).toEqual([])
    expect(service.getHistory('crypt')).toEqual([])
  })

  it('migrates the previous browserType storage field to scope', () => {
    configure({
      version: 1,
      presets: [
        {
          ...saved('legacy', 'Legacy', { clans: 'ventrue' }),
          scope: undefined,
          browserType: 'crypt',
        },
      ],
      history: [],
    })

    expect(service.getPresets('crypt')[0]).toMatchObject({
      id: 'legacy',
      scope: 'crypt',
    })
  })

  it('keeps the anonymous preset flow in the original storage blob', () => {
    configure()
    const created = take(
      service.savePreset('crypt', ' Ventrue ', {
        clans: 'ventrue',
        cardId: '10',
      }),
    )
    expect(created.status).toBe('saved')
    expect(service.getPresets('crypt')[0].params).toEqual({ clans: 'ventrue' })

    const duplicate = take(
      service.savePreset('crypt', 'ventrue', { name: 'Arika' }),
    )
    expect(duplicate.status).toBe('duplicate')
    take(service.savePreset('crypt', 'VENTRUE', { name: 'Arika' }, true))
    expect(service.getPresets('crypt')[0].params).toEqual({ name: 'Arika' })
    expect(
      (values.get(SearchFeaturesService.STORAGE_KEY) as { presets: unknown[] })
        .presets,
    ).toHaveLength(1)
    expect(api.create).not.toHaveBeenCalled()
  })

  it('renames and deletes presets while rejecting name collisions', () => {
    configure()
    const first = take(service.savePreset('decks', 'One', {}))
    const second = take(service.savePreset('decks', 'Two', {}))
    if (first.status !== 'saved' || second.status !== 'saved') {
      throw new Error('Preset setup failed')
    }
    expect(take(service.renamePreset(second.preset.id, 'one'))).toBe(
      'duplicate',
    )
    expect(take(service.renamePreset(second.preset.id, ' Renamed '))).toBe(
      'renamed',
    )
    take(service.deletePreset(first.preset.id))
    expect(service.getPresets('decks').map((preset) => preset.name)).toEqual([
      'Renamed',
    ])
  })

  it('records, finalizes, deduplicates, limits and clears local history', () => {
    configure()
    service.recordHistory('crypt', { sortBy: 'capacity', sortByOrder: 'desc' })
    service.recordHistory('crypt', { name: 'Arika' })
    service.recordHistory('crypt', { name: 'Arika Ambrosius' })
    expect(service.getHistory('crypt')).toHaveLength(1)
    service.finalizeHistoryDraft('crypt')
    service.recordHistory('crypt', { name: 'Anson' })
    service.finalizeHistoryDraft('crypt')
    service.recordHistory('crypt', { name: 'Arika Ambrosius' })
    expect(
      service.getHistory('crypt').map((entry) => entry.params['name']),
    ).toEqual(['Arika Ambrosius', 'Anson'])

    for (let index = 0; index < 12; index++) {
      service.recordHistory('decks', { name: `Deck ${index}` })
      service.finalizeHistoryDraft('decks')
    }
    expect(service.getHistory('decks')).toHaveLength(10)
    service.deleteHistory(service.getHistory('decks')[0].id)
    expect(service.getHistory('decks')).toHaveLength(9)
    service.clearHistory('decks')
    expect(service.getHistory('decks')).toEqual([])
  })

  it('hydrates the per-user cache immediately', () => {
    const list$ = new Subject<ApiSearchPreset[]>()
    configure(null, { user: 'alice', apiList: list$ })
    const cached = saved('cached', 'Cached', { clans: 'ventrue' }, 10)
    values.set('searchFeaturesPresets:alice', [cached])

    // Recreate after the cache has been populated.
    TestBed.resetTestingModule()
    configureWithExistingValues('alice', list$)

    expect(service.getPresets('crypt')).toEqual([cached])
    expect(service.syncing()).toBe(true)
  })

  it('adopts list results when there are no local presets', () => {
    const remote = apiPreset(7, 'remote-client', 'Server', {
      clans: 'malkavian',
    })
    configure(null, { user: 'alice', apiList: of([remote]) })

    expect(service.getPresets('crypt')[0]).toMatchObject({
      id: 'remote-client',
      remoteId: 7,
      name: 'Server',
    })
    expect(values.get('searchFeaturesPresets:alice')).toHaveLength(1)
  })

  it('discards a local preset with the same search signature', () => {
    const initial = storage([saved('local', 'Local', { clans: 'ventrue' })])
    const remote = apiPreset(7, 'remote', 'Remote', { clans: 'ventrue' })
    configure(initial, { user: 'alice', apiList: of([remote]) })

    expect(api.merge).not.toHaveBeenCalled()
    expect(service.getPresets('crypt').map((preset) => preset.name)).toEqual([
      'Remote',
    ])
  })

  it('renames a local name collision before merging it', () => {
    const initial = storage([saved('local', 'Ventrue', { name: 'Arika' })])
    const remote = apiPreset(7, 'remote', 'Ventrue', { clans: 'ventrue' })
    configure(initial, { user: 'alice', apiList: of([remote]) })

    expect(api.merge).toHaveBeenCalledWith([
      expect.objectContaining({ clientId: 'local', name: 'Ventrue (2)' }),
    ])
  })

  it('does not repeat login synchronization for the same user', () => {
    configure(null, { user: 'alice', apiList: of([]) })
    user$.next('alice')
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('serializes an overwrite behind login merge and uses its remote id', () => {
    const list$ = new Subject<ApiSearchPreset[]>()
    configure(storage([saved('local', 'Ventrue', { clans: 'ventrue' })]), {
      user: 'alice',
      apiList: list$,
    })
    let result: unknown
    service
      .savePreset('crypt', 'Ventrue', { name: 'Arika' }, true)
      .subscribe((value) => (result = value))

    expect(api.update).not.toHaveBeenCalled()
    list$.next([])
    list$.complete()

    expect(api.merge).toHaveBeenCalled()
    expect(api.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ scope: 'crypt', params: { name: 'Arika' } }),
    )
    expect(result).toMatchObject({ status: 'saved' })
  })

  it('logout clears user presets but preserves history', () => {
    const initial = storage(
      [],
      [
        {
          id: 'history',
          scope: 'crypt',
          params: { name: 'Arika' },
          createdAt: '2026-01-01',
        },
      ],
    )
    configure(initial, { user: 'alice', apiList: of([]) })
    values.set('searchFeaturesPresets:alice', [
      saved('cached', 'Cached', {}, 1),
    ])

    authenticated = false
    user$.next(undefined)

    expect(service.presets()).toEqual([])
    expect(service.history()).toHaveLength(1)
    expect(values.has('searchFeaturesPresets:alice')).toBe(false)
  })

  it('degrades after list 404 and saves locally afterwards', () => {
    configure(null, {
      user: 'alice',
      apiList: throwError(() => ({ status: 404 })),
    })
    expect(service.remoteAvailable()).toBe(false)

    const result = take(
      service.savePreset('crypt', 'Offline', { name: 'Arika' }),
    )
    expect(result.status).toBe('saved')
    expect(values.get('searchFeaturesPresets:alice')).toHaveLength(1)
    expect(api.create).not.toHaveBeenCalled()
  })

  it('degrades and commits locally after create 500', () => {
    configure(null, { user: 'alice', apiList: of([]) })
    api.create.mockReturnValue(throwError(() => ({ status: 500 })))

    const result = take(
      service.savePreset('crypt', 'Offline', { name: 'Arika' }),
    )

    expect(result.status).toBe('saved')
    expect(service.remoteAvailable()).toBe(false)
    expect(service.getPresets('crypt')).toHaveLength(1)
  })

  it('returns an error without disabling remote after create 400', () => {
    configure(null, { user: 'alice', apiList: of([]) })
    api.create.mockReturnValue(throwError(() => ({ status: 400 })))

    expect(take(service.savePreset('crypt', 'Rejected', {}))).toEqual({
      status: 'error',
    })
    expect(service.remoteAvailable()).toBe(true)
    expect(service.getPresets('crypt')).toEqual([])
  })

  function configureWithExistingValues(
    user: string,
    list$: Observable<ApiSearchPreset[]>,
  ): void {
    user$ = new BehaviorSubject<string | undefined>(user)
    authenticated = true
    api.list.mockReturnValue(list$)
    TestBed.configureTestingModule({
      providers: [
        SearchFeaturesService,
        {
          provide: LocalStorageService,
          useValue: {
            getValue: (key: string) => values.get(key) ?? null,
            setValue: (key: string, value: unknown) => values.set(key, value),
            clearValue: (key: string) => values.delete(key),
          },
        },
        {
          provide: AuthQuery,
          useValue: {
            selectUser: () => user$,
            isAuthenticated: () => authenticated,
          },
        },
        { provide: SearchPresetApiDataService, useValue: api },
      ],
    })
    service = TestBed.inject(SearchFeaturesService)
  }

  function saved(
    id: string,
    name: string,
    params: Record<string, string>,
    remoteId?: number,
  ): SavedSearchPreset {
    return {
      id,
      remoteId,
      scope: 'crypt',
      name,
      params,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
  }

  function apiPreset(
    id: number,
    clientId: string,
    name: string,
    params: Record<string, string>,
  ): ApiSearchPreset {
    return { id, clientId, scope: 'crypt', name, params }
  }

  function storage(
    presets: SavedSearchPreset[],
    history: unknown[] = [],
  ): unknown {
    return { version: 1, presets, history }
  }
})
