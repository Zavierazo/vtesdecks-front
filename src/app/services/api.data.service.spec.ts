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

describe('ApiDataService deck views', () => {
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
