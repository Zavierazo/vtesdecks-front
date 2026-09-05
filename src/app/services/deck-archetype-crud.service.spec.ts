import { TestBed } from '@angular/core/testing'
import { ApiDeckArchetype } from '@models'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { ApiDataService } from './api.data.service'
import { DeckArchetypeCrudService } from './deck-archetype-crud.service'

describe('DeckArchetypeCrudService', () => {
  const periodArchetype: ApiDeckArchetype = {
    id: 1,
    name: 'Original name',
    type: 'Bleed',
    deckId: 'deck-1',
    enabled: true,
    deckCount: 20,
    metaCount: 5,
    metaTotal: 100,
    previousMetaCount: 2,
    previousMetaTotal: 100,
    metaShareChange: 3,
    trend: 'TRENDING',
    clans: ['Malkavian'],
    disciplines: ['Dementation'],
    creationDate: new Date('2026-01-01'),
    modificationDate: new Date('2026-01-01'),
  }

  it('keeps the active metagame period metrics when an archetype is updated', () => {
    const allTimeUpdate: ApiDeckArchetype = {
      ...periodArchetype,
      name: 'Updated name',
      metaCount: 50,
      metaTotal: 1000,
      previousMetaCount: null,
      previousMetaTotal: null,
      metaShareChange: null,
      trend: undefined,
    }
    const api = {
      getAllDeckArchetypes: vi.fn(() => of([periodArchetype])),
      updateDeckArchetype: vi.fn(() => of(allTimeUpdate)),
    }
    TestBed.configureTestingModule({
      providers: [{ provide: ApiDataService, useValue: api }],
    })
    const service = TestBed.inject(DeckArchetypeCrudService)
    let items: ApiDeckArchetype[] | null = null
    service.selectAll().subscribe((value) => (items = value))

    service.loadAll('TOURNAMENT_365').subscribe()
    service.update(allTimeUpdate).subscribe()

    expect(items).toEqual([
      {
        ...allTimeUpdate,
        metaCount: periodArchetype.metaCount,
        metaTotal: periodArchetype.metaTotal,
        previousMetaCount: periodArchetype.previousMetaCount,
        previousMetaTotal: periodArchetype.previousMetaTotal,
        metaShareChange: periodArchetype.metaShareChange,
        trend: periodArchetype.trend,
      },
    ])
  })
})
