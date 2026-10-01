import { DOCUMENT } from '@angular/common'
import { AuthQuery } from '@state/auth/auth.query'
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
    writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockResolvedValue(undefined)
    toastShow = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        SearchFeaturesUiService,
        { provide: AuthQuery, useValue: { getUser: () => 'owner' } },
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
    Object.defineProperty(document.defaultView!.navigator, 'share', {
      configurable: true,
      value: undefined,
    })
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

  it('copies a public owner search and explains omitted personal filters', async () => {
    expect(
      await service.copyLink('decks', {
        type: 'USER',
        tags: 'league',
        collectionPercentage: '100',
      }),
    ).toBe(true)
    const url = new URL(writeText.mock.calls[0][0])
    expect(url.searchParams.get('username')).toBe('owner')
    expect(url.searchParams.get('tags')).toBe('league')
    expect(url.searchParams.has('collectionPercentage')).toBe(false)
    expect(toastShow.mock.calls[0][0]).toBe('custom_tags.shared_omitted')
  })

  it('uses native sharing with the transformed search and preserves the open filters', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(
      TestBed.inject(DOCUMENT).defaultView!.navigator,
      'share',
      { configurable: true, value: share },
    )
    const params = { type: 'USER', tags: 'league', favorite: 'true' }
    expect(await service.shareLink('decks', params)).toBe(true)
    const url = new URL(share.mock.calls[0][0].url)
    expect(url.searchParams.get('username')).toBe('owner')
    expect(url.searchParams.get('tags')).toBe('league')
    expect(url.searchParams.has('favorite')).toBe(false)
    expect(params).toEqual({ type: 'USER', tags: 'league', favorite: 'true' })
    expect(writeText).not.toHaveBeenCalled()
    expect(toastShow).toHaveBeenCalledWith('custom_tags.shared_omitted', {
      classname: 'bg-success text-light',
    })
  })

  it('falls back to copying when native sharing is unavailable', async () => {
    expect(await service.shareLink('decks', { tags: 'league' })).toBe(true)
    expect(writeText).toHaveBeenCalled()
    expect(toastShow).toHaveBeenCalledWith('search_features.copied', {
      classname: 'bg-success text-light',
    })
  })

  it('does not copy or show an error when native sharing is cancelled', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    Object.defineProperty(
      TestBed.inject(DOCUMENT).defaultView!.navigator,
      'share',
      { configurable: true, value: share },
    )
    expect(await service.shareLink('decks', {})).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
    expect(toastShow).not.toHaveBeenCalled()
  })

  it('reports native sharing failures without copying unexpectedly', async () => {
    const share = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(
      TestBed.inject(DOCUMENT).defaultView!.navigator,
      'share',
      { configurable: true, value: share },
    )
    expect(await service.shareLink('decks', {})).toBe(false)
    expect(writeText).not.toHaveBeenCalled()
    expect(toastShow).toHaveBeenCalledWith('search_features.share_error', {
      classname: 'bg-danger text-light',
    })
  })

  it('produces a readable summary instead of a query string', () => {
    expect(service.summary('crypt', { name: 'Arika', clans: 'ventrue' })).toBe(
      'Clans: ventrue · Name: Arika',
    )
  })
})
