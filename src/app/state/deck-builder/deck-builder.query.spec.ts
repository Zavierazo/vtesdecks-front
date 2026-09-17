import { TestBed } from '@angular/core/testing'
import { CardReleaseStatusService } from '@services'
import { CryptQuery } from '../crypt/crypt.query'
import { LibraryQuery } from '../library/library.query'
import { DeckBuilderQuery } from './deck-builder.query'
import { DeckBuilderStore } from './deck-builder.store'
import { firstValueFrom, of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('Builder crypt capacity statistics', () => {
  afterEach(() => TestBed.resetTestingModule())
  function setup(cards: { id: number; number: number }[]) {
    TestBed.configureTestingModule({
      providers: [
        ...[DeckBuilderStore, LibraryQuery, CardReleaseStatusService].map(
          (provide) => ({ provide, useValue: {} }),
        ),
        {
          provide: CryptQuery,
          useValue: {
            getEntity: (id: number) => ({ capacity: id === 200001 ? 4 : 10 }),
          },
        },
      ],
    })
    const query = TestBed.inject(DeckBuilderQuery)
    vi.spyOn(query, 'selectCrypt').mockReturnValue(of(cards))
    return query
  }
  it('shows zero rather than NaN for an empty crypt', async () => {
    expect(await firstValueFrom(setup([]).selectAvgCrypt())).toBe(0)
  })
  it('counts each copy for the average and cheapest/most expensive four-card draws', async () => {
    const query = setup([
      { id: 200001, number: 4 },
      { id: 200002, number: 2 },
    ])
    expect(await firstValueFrom(query.selectAvgCrypt())).toBe(6)
    expect(await firstValueFrom(query.selectMinCrypt())).toBe(16)
    expect(await firstValueFrom(query.selectMaxCrypt())).toBe(28)
  })
  it('ignores zero-quantity cards', async () => {
    expect(
      await firstValueFrom(
        setup([
          { id: 200001, number: 1 },
          { id: 200002, number: 0 },
        ]).selectAvgCrypt(),
      ),
    ).toBe(4)
  })
})
