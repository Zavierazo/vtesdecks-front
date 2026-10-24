import { TestBed } from '@angular/core/testing'
import { ApiCard } from '@models'
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

describe('Builder crypt discipline statistics', () => {
  afterEach(() => TestBed.resetTestingModule())
  const cards = [
    { id: 200001, number: 2 },
    { id: 200002, number: 0 },
    { id: 100001, number: 3 },
  ]
  function setup() {
    const getDisciplines = vi.fn().mockReturnValue([])
    TestBed.configureTestingModule({
      providers: [
        ...[LibraryQuery, CardReleaseStatusService].map((provide) => ({
          provide,
          useValue: {},
        })),
        {
          provide: DeckBuilderStore,
          useValue: { getValue: () => ({ cards }) },
        },
        { provide: CryptQuery, useValue: { getDisciplines } },
      ],
    })
    const query = TestBed.inject(DeckBuilderQuery)
    vi.spyOn(query, 'selectCrypt').mockReturnValue(of(cards.slice(0, 2)))
    return { query, getDisciplines }
  }
  it('ignores sideboarded vampires in the displayed stats', async () => {
    const { query, getDisciplines } = setup()
    await firstValueFrom(query.selectCryptDisciplines())
    expect(getDisciplines).toHaveBeenCalledWith([{ id: 200001, number: 2 }])
  })
  it('ignores sideboarded vampires when read synchronously', () => {
    const { query, getDisciplines } = setup()
    query.getCryptDisciplines()
    expect(getDisciplines).toHaveBeenCalledWith([{ id: 200001, number: 2 }])
  })
})

describe('Builder library grouping', () => {
  afterEach(() => TestBed.resetTestingModule())

  it('resolves missing card types from the catalog without changing draft quantities or existing types', async () => {
    const cards: ApiCard[] = [
      { id: 200001, number: 2 },
      { id: 100001, number: 3 },
      { id: 100002, number: 6, type: '' },
      { id: 100003, number: 0, type: 'Event' },
      { id: 100004, number: 1 },
    ]
    const state = { cards }
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DeckBuilderStore,
          useValue: {
            select: (selector: (value: typeof state) => unknown) =>
              of(selector(state)),
          },
        },
        {
          provide: LibraryQuery,
          useValue: {
            getEntity: (id: number) => {
              const type = (
                { 100001: 'Master', 100002: 'Action/Reaction' } as Record<
                  number,
                  string
                >
              )[id]
              return type ? { type } : undefined
            },
          },
        },
        { provide: CryptQuery, useValue: {} },
        { provide: CardReleaseStatusService, useValue: {} },
      ],
    })

    const library = await firstValueFrom(
      TestBed.inject(DeckBuilderQuery).selectLibrary(),
    )
    expect(
      library.map(({ id, number, type }) => ({ id, number, type })),
    ).toEqual([
      { id: 100001, number: 3, type: 'Master' },
      { id: 100002, number: 6, type: 'Action/Reaction' },
      { id: 100003, number: 0, type: 'Event' },
      { id: 100004, number: 1, type: undefined },
    ])
    expect(cards[1].type).toBeUndefined()
    expect(cards[2].type).toBe('')
  })
})
