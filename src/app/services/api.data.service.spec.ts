import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { environment } from '@environments/environment'
import { AuthQuery } from '@state/auth/auth.query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiDataService } from './api.data.service'
import { SessionStorageService } from './session-storage.service'
import { RETRY_REPEATABLE_POST } from '../http-retry.context'

describe('ApiDataService', () => {
  let service: ApiDataService
  let http: HttpTestingController
  const getValue = vi.fn()
  const setValue = vi.fn()
  const getUser = vi.fn()

  beforeEach(() => {
    getValue.mockReset()
    setValue.mockReset()
    getUser.mockReset()
    getUser.mockReturnValue('alice')
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthQuery, useValue: { getUser } },
        { provide: SessionStorageService, useValue: { getValue, setValue } },
      ],
    })
    service = TestBed.inject(ApiDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('requests a specific notification page with backward-compatible defaults', () => {
    service.getNotifications().subscribe()
    const firstPage = http.expectOne(
      `${environment.api.baseUrl}/user/notifications?page=0&limit=50`,
    )
    expect(firstPage.request.method).toBe('GET')
    firstPage.flush([])

    service.getNotifications(2, 25).subscribe()
    const requestedPage = http.expectOne(
      `${environment.api.baseUrl}/user/notifications?page=2&limit=25`,
    )
    expect(requestedPage.request.method).toBe('GET')
    requestedPage.flush([])
  })

  it('marks bulk collection statistics as a repeatable POST', () => {
    service.getCardCollectionStatsBulk([100001, 200001], true).subscribe()

    const request = http.expectOne(
      `${environment.api.baseUrl}/user/collections/cards/stats`,
    )
    expect(request.request.method).toBe('POST')
    expect(request.request.context.get(RETRY_REPEATABLE_POST)).toBe(true)
    request.flush([])
  })

  it('marks login as a repeatable POST and refreshes with GET', () => {
    service.login('alice', 'secret', 'captcha').subscribe()

    const login = http.expectOne(`${environment.api.baseUrl}/auth/login`)
    expect(login.request.method).toBe('POST')
    expect(login.request.context.get(RETRY_REPEATABLE_POST)).toBe(true)
    login.flush({ user: 'alice' })

    service.userRefresh().subscribe()
    const refresh = http.expectOne(`${environment.api.baseUrl}/user/refresh`)
    expect(refresh.request.method).toBe('GET')
    refresh.flush({ user: 'alice' })
  })

  it('retries ordinary saves for an existing deck only', () => {
    service.saveDeckBuilder({ id: 'deck-1', cards: [] }).subscribe()
    const existing = http.expectOne(
      `${environment.api.baseUrl}/user/decks/builder`,
    )
    expect(existing.request.context.get(RETRY_REPEATABLE_POST)).toBe(true)
    existing.flush({ id: 'deck-1', cards: [] })

    service.saveDeckBuilder({ cards: [] }).subscribe()
    const created = http.expectOne(
      `${environment.api.baseUrl}/user/decks/builder`,
    )
    expect(created.request.context.get(RETRY_REPEATABLE_POST)).toBe(false)
    created.flush({ id: 'deck-2', cards: [] })

    service
      .saveDeckBuilder({ id: 'deck-1', cards: [], tagLabel: 'Checkpoint' })
      .subscribe()
    const tagged = http.expectOne(
      `${environment.api.baseUrl}/user/decks/builder`,
    )
    expect(tagged.request.context.get(RETRY_REPEATABLE_POST)).toBe(false)
    tagged.flush({ id: 'deck-1', cards: [] })
  })

  it('marks explicit state changes as repeatable but leaves creates unmarked', () => {
    service.rateDeck('deck-1', 5).subscribe()
    const rating = http.expectOne(
      `${environment.api.baseUrl}/user/decks/rating`,
    )
    expect(rating.request.context.get(RETRY_REPEATABLE_POST)).toBe(true)
    rating.flush(true)

    service
      .register('alice', 'alice@example.com', 'secret', 'secret', 'captcha')
      .subscribe()
    const register = http.expectOne(`${environment.api.baseUrl}/auth/create`)
    expect(register.request.context.get(RETRY_REPEATABLE_POST)).toBe(false)
    register.flush({})
  })

  it('deduplicates views by authenticated account and stores only successful posts', () => {
    service.deckView('deck-1', '/decks').subscribe()

    expect(getValue).toHaveBeenCalledWith('deck-view-alice-deck-1')
    expect(setValue).not.toHaveBeenCalled()
    const request = http.expectOne(
      `${environment.api.baseUrl}/decks/deck-1/view`,
    )
    request.flush(true)
    expect(setValue).toHaveBeenCalledWith('deck-view-alice-deck-1', true)
  })

  it('does not store failed views so a later visit can retry', () => {
    service.deckView('deck-1', '/decks').subscribe({ error: () => undefined })

    const request = http.expectOne(
      `${environment.api.baseUrl}/decks/deck-1/view`,
    )
    request.flush('failed', { status: 500, statusText: 'Server error' })
    expect(setValue).not.toHaveBeenCalled()
  })

  it('does not post a view already recorded for this account and session', () => {
    getValue.mockReturnValue(true)

    service
      .deckView('deck-1', '/decks')
      .subscribe((result) => expect(result).toBe(true))

    http.expectNone(`${environment.api.baseUrl}/decks/deck-1/view`)
  })

  it('uses a separate anonymous session key', () => {
    getUser.mockReturnValue(undefined)

    service.deckView('deck-1', '/decks').subscribe()

    expect(getValue).toHaveBeenCalledWith('deck-view-anonymous-deck-1')
    http.expectOne(`${environment.api.baseUrl}/decks/deck-1/view`).flush(true)
  })
})
