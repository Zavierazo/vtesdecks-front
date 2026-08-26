import { TestBed } from '@angular/core/testing'
import { ApiCrypt, ApiLibrary } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { BehaviorSubject, firstValueFrom, of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { CardReleaseStatusService } from './card-release-status.service'

describe('CardReleaseStatusService', () => {
  const spoilerCrypt = { id: 200001, unreleased: true } as ApiCrypt
  const releasedLibrary = { id: 100001, unreleased: false } as ApiLibrary
  const spoilerLibrary = { id: 100002, unreleased: true } as ApiLibrary

  function setup(): CardReleaseStatusService {
    const cryptQuery = {
      getEntity: vi.fn((id: number) =>
        id === spoilerCrypt.id ? spoilerCrypt : undefined,
      ),
      selectAll: vi.fn(() => of([spoilerCrypt])),
    }
    const libraryQuery = {
      getEntity: vi.fn((id: number) =>
        [releasedLibrary, spoilerLibrary].find((card) => card.id === id),
      ),
      selectAll: vi.fn(() => of([releasedLibrary, spoilerLibrary])),
    }

    TestBed.configureTestingModule({
      providers: [
        { provide: CryptQuery, useValue: cryptQuery },
        { provide: LibraryQuery, useValue: libraryQuery },
      ],
    })
    return TestBed.inject(CardReleaseStatusService)
  }

  it('identifies unreleased crypt and library cards', () => {
    const service = setup()

    expect(service.isUnreleased(spoilerCrypt.id)).toBe(true)
    expect(service.isUnreleased(spoilerLibrary.id)).toBe(true)
    expect(service.isUnreleased(releasedLibrary.id)).toBe(false)
  })

  it('counts only positive unreleased copies', () => {
    const service = setup()

    expect(
      service.countUnreleasedCopies([
        { id: spoilerCrypt.id, number: 2 },
        { id: spoilerLibrary.id, number: 3 },
        { id: releasedLibrary.id, number: 4 },
        { id: spoilerLibrary.id, number: 0 },
      ]),
    ).toBe(5)
  })

  it('exposes a reactive unreleased copy count', async () => {
    const service = setup()
    const cards$ = new BehaviorSubject([
      { id: spoilerCrypt.id, number: 2 },
      { id: releasedLibrary.id, number: 4 },
    ])

    await expect(
      firstValueFrom(service.selectUnreleasedCopyCount(cards$)),
    ).resolves.toBe(2)
  })
})
