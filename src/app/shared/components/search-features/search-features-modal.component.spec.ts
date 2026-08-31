import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { SearchFeaturesService, SearchFeaturesUiService } from '@services'
import { SearchFeaturesModalComponent } from './search-features-modal.component'

describe('SearchFeaturesModalComponent', () => {
  let close: ReturnType<typeof vi.fn>
  let renamePreset: ReturnType<typeof vi.fn>
  let deletePreset: ReturnType<typeof vi.fn>

  const setup = () => {
    close = vi.fn()
    renamePreset = vi.fn(() => 'renamed')
    deletePreset = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        { provide: NgbActiveOffcanvas, useValue: { close, dismiss: vi.fn() } },
        {
          provide: SearchFeaturesService,
          useValue: {
            getPresets: vi.fn(() => []),
            getHistory: vi.fn(() => []),
            renamePreset,
            deletePreset,
            deleteHistory: vi.fn(),
            clearHistory: vi.fn(),
          },
        },
        {
          provide: SearchFeaturesUiService,
          useValue: { summary: vi.fn(() => 'Summary') },
        },
        {
          provide: TranslocoService,
          useValue: { translate: vi.fn((key: string) => key) },
        },
      ],
    })
    return TestBed.createComponent(SearchFeaturesModalComponent)
      .componentInstance
  }

  afterEach(() => TestBed.resetTestingModule())

  it('normalizes a restored search and closes the manager after applying it', async () => {
    const component = setup()
    const apply = vi.fn(() => Promise.resolve(true))
    component.initialize('library', apply)

    component.apply({ types: 'action', cardId: '5', unknown: 'value' })
    await Promise.resolve()

    expect(apply).toHaveBeenCalledWith({ types: 'action' })
    expect(close).toHaveBeenCalled()
  })

  it('renames a preset inline', () => {
    const component = setup()
    const preset = {
      id: 'preset-1',
      browserType: 'crypt' as const,
      name: 'Old',
      params: {},
      createdAt: '',
      updatedAt: '',
    }
    component.startRename(preset)
    component.renameValue = 'New'
    component.rename(preset)

    expect(renamePreset).toHaveBeenCalledWith('preset-1', 'New')
    expect(component.editingPresetId).toBeNull()
  })

  it('requires an inline confirmation before deleting a preset', () => {
    const component = setup()
    component.requestDeletePreset('preset-1')
    expect(deletePreset).not.toHaveBeenCalled()

    component.deletePreset('preset-1')
    expect(deletePreset).toHaveBeenCalledWith('preset-1')
    expect(component.pendingDeletePresetId).toBeNull()
  })
})
