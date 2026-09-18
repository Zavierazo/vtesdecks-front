import { Clipboard } from '@angular/cdk/clipboard'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeckShareService } from './deck-share.service'
import { ToastService } from './toast.service'

describe('DeckShareService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    TestBed.resetTestingModule()
  })
  function setup(nativeShare?: ReturnType<typeof vi.fn>, copied = true) {
    vi.stubGlobal('navigator', { share: nativeShare })
    const copy = vi.fn(() => copied)
    const show = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        { provide: Clipboard, useValue: { copy } },
        { provide: ToastService, useValue: { show } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
    return { service: TestBed.inject(DeckShareService), copy, show }
  }
  it('calls native sharing synchronously from the click', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const { service, copy } = setup(share)
    const result = service.share('https://vtesdecks.com/deck/snapshot#v1=abc')
    expect(share).toHaveBeenCalledOnce()
    await result
    expect(copy).not.toHaveBeenCalled()
  })
  it('does not copy or show an error on user cancellation', async () => {
    const { service, copy, show } = setup(
      vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
    )
    await service.share('url')
    expect(copy).not.toHaveBeenCalled()
    expect(show).not.toHaveBeenCalled()
  })
  it('falls back to copying on unsupported or failed sharing', async () => {
    const { service, copy, show } = setup(
      vi.fn().mockRejectedValue(new Error('Not available')),
    )
    await service.share('url')
    expect(copy).toHaveBeenCalledWith('url')
    expect(show).toHaveBeenCalledWith('snapshot.copied', expect.anything())
  })
  it('never reports success when copying fails', async () => {
    const { service, show } = setup(undefined, false)
    await service.share('url')
    expect(show).toHaveBeenCalledWith('snapshot.copy_error', expect.anything())
  })
})
