import { TestBed } from '@angular/core/testing'
import { LocalStorageService } from './local-storage.service'
import { SearchFeaturesService } from './search-features.service'

describe('SearchFeaturesService', () => {
  let service: SearchFeaturesService
  let stored: unknown
  let setValue: ReturnType<typeof vi.fn>

  const configure = (initial: unknown = null) => {
    stored = initial
    setValue = vi.fn((_key: string, value: unknown) => (stored = value))
    TestBed.configureTestingModule({
      providers: [
        SearchFeaturesService,
        {
          provide: LocalStorageService,
          useValue: {
            getValue: vi.fn(() => stored),
            setValue,
          },
        },
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

  it('saves presets per browser and requires explicit overwrite', () => {
    configure()
    const created = service.savePreset('crypt', ' Ventrue ', {
      clans: 'ventrue',
      cardId: '10',
    })
    expect(created.status).toBe('saved')
    expect(service.getPresets('crypt')[0].params).toEqual({ clans: 'ventrue' })
    expect(service.getPresets('library')).toEqual([])

    const duplicate = service.savePreset('crypt', 'ventrue', { name: 'Arika' })
    expect(duplicate.status).toBe('duplicate')
    expect(service.getPresets('crypt')[0].params).toEqual({ clans: 'ventrue' })

    service.savePreset('crypt', 'VENTRUE', { name: 'Arika' }, true)
    expect(service.getPresets('crypt')).toHaveLength(1)
    expect(service.getPresets('crypt')[0].params).toEqual({ name: 'Arika' })
  })

  it('renames and deletes presets while rejecting name collisions', () => {
    configure()
    const first = service.savePreset('decks', 'One', {})
    const second = service.savePreset('decks', 'Two', {})
    if (first.status !== 'saved' || second.status !== 'saved') {
      throw new Error('Preset setup failed')
    }
    expect(service.renamePreset(second.preset.id, 'one')).toBe('duplicate')
    expect(service.renamePreset(second.preset.id, ' Renamed ')).toBe('renamed')
    service.deletePreset(first.preset.id)
    expect(service.getPresets('decks').map((preset) => preset.name)).toEqual([
      'Renamed',
    ])
  })

  it('records only meaningful searches and skips consecutive duplicates', () => {
    configure()
    service.recordHistory('crypt', { sortBy: 'capacity', sortByOrder: 'desc' })
    service.recordHistory('crypt', { name: 'Arika' })
    service.recordHistory('crypt', { name: 'Arika', cardId: '1' })
    expect(service.getHistory('crypt')).toHaveLength(1)
    expect(service.getHistory('crypt')[0].params).toEqual({ name: 'Arika' })
  })

  it('limits history to ten entries per browser and clears one browser only', () => {
    configure()
    for (let index = 0; index < 12; index++) {
      service.recordHistory('decks', { name: `Deck ${index}` })
    }
    service.recordHistory('library', { name: 'Library card' })
    expect(service.getHistory('decks')).toHaveLength(10)
    expect(service.getHistory('library')).toHaveLength(1)

    const entry = service.getHistory('decks')[0]
    service.deleteHistory(entry.id)
    expect(service.getHistory('decks')).toHaveLength(9)
    service.clearHistory('decks')
    expect(service.getHistory('decks')).toEqual([])
    expect(service.getHistory('library')).toHaveLength(1)
    expect(setValue).toHaveBeenCalled()
  })
})
