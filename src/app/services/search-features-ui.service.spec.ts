import { DOCUMENT } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { SearchFeaturesUiService } from './search-features-ui.service'
import { ToastService } from './toast.service'

describe('SearchFeaturesUiService', () => {
  let service: SearchFeaturesUiService
  let writeText: ReturnType<typeof vi.fn>
  let toastShow: ReturnType<typeof vi.fn>
  let origin: string

  beforeEach(() => {
    writeText = vi.fn(() => Promise.resolve())
    toastShow = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        SearchFeaturesUiService,
        { provide: ToastService, useValue: { show: toastShow } },
        {
          provide: TranslocoService,
          useValue: {
            translate: vi.fn(
              (key: string) =>
                ({
                  'search_features.params.clans': 'Clans',
                  'search_features.params.name': 'Name',
                })[key] ?? key,
            ),
          },
        },
        { provide: CryptQuery, useValue: { getEntity: vi.fn() } },
        { provide: LibraryQuery, useValue: { getEntity: vi.fn() } },
      ],
    })
    const document = TestBed.inject(DOCUMENT)
    origin = document.location.origin
    Object.defineProperty(document.defaultView!.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    service = TestBed.inject(SearchFeaturesUiService)
  })

  afterEach(() => TestBed.resetTestingModule())

  it('copies a canonical link and only shows success after clipboard resolves', async () => {
    await service.copyLink('crypt', {
      name: 'Arika',
      sortBy: 'name',
      cardId: '10',
    })

    expect(writeText).toHaveBeenCalledWith(`${origin}/cards/crypt?name=Arika`)
    expect(toastShow).toHaveBeenCalledWith('search_features.copied', {
      classname: 'bg-success text-light',
    })
  })

  it('shows an error toast when clipboard writing fails', async () => {
    writeText.mockRejectedValue(new Error('denied'))

    expect(await service.copyLink('decks', {})).toBe(false)
    expect(toastShow).toHaveBeenCalledWith('search_features.copy_error', {
      classname: 'bg-danger text-light',
    })
  })

  it('produces a readable summary instead of a query string', () => {
    expect(service.summary('crypt', { name: 'Arika', clans: 'ventrue' })).toBe(
      'Clans: ventrue · Name: Arika',
    )
  })
})
