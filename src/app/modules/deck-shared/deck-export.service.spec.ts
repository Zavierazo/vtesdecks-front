import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { ApiDeckBuilderHistory } from '@models'
import { ApiDataService, ToastService } from '@services'
import { of, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeckExportService } from './deck-export.service'

describe('DeckExportService', () => {
  const checkpoint: ApiDeckBuilderHistory = {
    action: 'UPDATE',
    cardId: 200001,
    number: 2,
    date: '2026-11-13',
    tag: 2,
  }
  const getExportDeck = vi.fn(() => of('2xCard'))
  const getDeckBuilderHistory = vi.fn(() => of([checkpoint]))
  const show = vi.fn()
  let filenames: string[]

  beforeEach(() => {
    vi.useFakeTimers()
    filenames = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filenames.push(this.download)
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:deck')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ApiDataService,
          useValue: { getExportDeck, getDeckBuilderHistory },
        },
        { provide: ToastService, useValue: { show } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
      ],
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    TestBed.resetTestingModule()
  })

  it('uses the deck name, current checkpoint number and export format', () => {
    TestBed.inject(DeckExportService)
      .download('abc', 'LACKEY', 'Malkavian: Bleed', true)
      .subscribe()

    expect(getExportDeck).toHaveBeenCalledExactlyOnceWith('abc', 'LACKEY')
    expect(getDeckBuilderHistory).toHaveBeenCalledExactlyOnceWith('abc', true)
    expect(filenames).toEqual(['Malkavian_ Bleed - v2 - LACKEY.txt'])
    vi.runOnlyPendingTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:deck')
  })

  it('omits the number if the card list has changed since the checkpoint', () => {
    getDeckBuilderHistory.mockReturnValueOnce(
      of([checkpoint, { ...checkpoint, tag: undefined, number: 3 }]),
    )
    TestBed.inject(DeckExportService)
      .download('abc', 'JOL', 'Malkavian Bleed', true)
      .subscribe()

    expect(filenames).toEqual(['Malkavian Bleed - JOL.txt'])
  })

  it('uses the deck name without requesting private history for other viewers', () => {
    TestBed.inject(DeckExportService)
      .download('abc', 'TWD', 'République', false)
      .subscribe()

    expect(getDeckBuilderHistory).not.toHaveBeenCalled()
    expect(filenames).toEqual(['République - TWD.txt'])
  })

  it('still downloads the file if private history is unavailable', () => {
    getDeckBuilderHistory.mockReturnValueOnce(
      throwError(() => new Error('Unavailable')),
    )
    TestBed.inject(DeckExportService)
      .download('abc', 'TWD', 'Malkavian Bleed', true)
      .subscribe()

    expect(filenames).toEqual(['Malkavian Bleed - TWD.txt'])
    expect(show).not.toHaveBeenCalled()
  })
})
