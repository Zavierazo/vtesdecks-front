import { ChangeDetectorRef, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ApiDeck, ApiHome } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService, LocalStorageService, SeoService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeComponent } from './home.component'

describe('HomeComponent', () => {
  afterEach(() => TestBed.resetTestingModule())

  function setup(isAuthenticated: boolean, deckHome: ApiHome): HomeComponent {
    TestBed.configureTestingModule({
      providers: [
        { provide: NgbModal, useValue: {} },
        {
          provide: ApiDataService,
          useValue: { getDeckHome: () => of(deckHome) },
        },
        {
          provide: AuthQuery,
          useValue: {
            serverDate: () => signal<Date | undefined>(undefined),
            selectAuthenticated: () => of(isAuthenticated),
          },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { markForCheck: vi.fn() },
        },
        {
          provide: LocalStorageService,
          useValue: { getValue: () => undefined, setValue: vi.fn() },
        },
        { provide: SeoService, useValue: { update: vi.fn() } },
      ],
    })

    const component = TestBed.runInInjectionContext(() => new HomeComponent())
    component.ngOnInit()
    return component
  }

  it('shows spoiler decks unless the backend marks them as viewed', () => {
    const viewed = { id: 'viewed', visitStatus: 'VIEWED' } as ApiDeck
    const updated = { id: 'updated', visitStatus: 'UPDATED' } as ApiDeck
    const unseen = { id: 'unseen' } as ApiDeck
    const component = setup(true, {
      spoilerDecks: [viewed, updated, unseen],
    } as ApiHome)

    expect(component.newSpoilerDecks).toEqual([updated, unseen])
  })

  it('does not show the spoiler banner to anonymous users', () => {
    const component = setup(false, {
      spoilerDecks: [{ id: 'unseen' } as ApiDeck],
    } as ApiHome)

    expect(component.newSpoilerDecks).toEqual([])
  })
})
