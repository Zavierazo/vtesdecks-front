import { TestBed } from '@angular/core/testing'
import { LocalStorageService } from './local-storage.service'
import { SpoilerVisitService } from './spoiler-visit.service'

describe('SpoilerVisitService', () => {
  let service: SpoilerVisitService
  let store: Record<string, unknown>
  let setValue: ReturnType<typeof vi.fn>

  beforeEach(() => {
    store = {}
    setValue = vi.fn((key: string, value: unknown) => (store[key] = value))
    TestBed.configureTestingModule({
      providers: [
        SpoilerVisitService,
        {
          provide: LocalStorageService,
          useValue: { getValue: (key: string) => store[key], setValue },
        },
      ],
    })
    service = TestBed.inject(SpoilerVisitService)
  })

  it('highlights nothing the first time the catalog is stored', () => {
    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).toHaveBeenCalledWith('spoiler_catalog', {
      latest: '2026-08-28T09:00:00.000Z',
      newSince: '2026-08-28T09:00:00.000Z',
    })
    expect(service.isNewCard('2026-08-28T09:00:00Z')).toBe(false)
  })

  it('highlights the cards revealed after the previous batch', () => {
    store['spoiler_catalog'] = {
      latest: '2026-08-20T09:00:00Z',
      newSince: '2026-08-10T09:00:00Z',
    }

    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).toHaveBeenCalledWith('spoiler_catalog', {
      latest: '2026-08-28T09:00:00.000Z',
      newSince: '2026-08-20T09:00:00Z',
    })
    expect(service.isNewCard('2026-08-24T09:00:00Z')).toBe(true)
    expect(service.isNewCard('2026-08-15T09:00:00Z')).toBe(false)
  })

  it('keeps the baseline while no newer card shows up', () => {
    store['spoiler_catalog'] = {
      latest: '2026-08-28T09:00:00Z',
      newSince: '2026-08-20T09:00:00Z',
    }

    service.markSpoilersSeen('2026-08-28T09:00:00Z')

    expect(setValue).not.toHaveBeenCalled()
    expect(service.isNewCard('2026-08-24T09:00:00Z')).toBe(true)
  })

  it('highlights no card while there is no baseline', () => {
    expect(service.isNewCard('2026-08-28T12:00:00Z')).toBe(false)
    expect(service.isNewCard('invalid')).toBe(false)
  })

  it('ignores an invalid catalog update', () => {
    service.markSpoilersSeen('invalid')

    expect(setValue).not.toHaveBeenCalled()
  })
})
