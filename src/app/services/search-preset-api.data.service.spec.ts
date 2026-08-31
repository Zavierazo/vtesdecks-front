import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { environment } from '@environments/environment'
import { ApiSearchPreset } from '@models'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SearchPresetApiDataService } from './search-preset-api.data.service'

describe('SearchPresetApiDataService', () => {
  let service: SearchPresetApiDataService
  let http: HttpTestingController
  const url = `${environment.api.baseUrl}/user/search-presets`
  const preset: ApiSearchPreset = {
    clientId: 'client-id',
    scope: 'crypt',
    name: 'Ventrue',
    params: { clans: 'ventrue' },
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(SearchPresetApiDataService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('lists presets', () => {
    service.list().subscribe()
    const request = http.expectOne(url)
    expect(request.request.method).toBe('GET')
    request.flush([])
  })

  it('creates a preset', () => {
    service.create(preset).subscribe()
    const request = http.expectOne(url)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual(preset)
    request.flush({ ...preset, id: 1 })
  })

  it('updates a preset', () => {
    service.update(1, preset).subscribe()
    const request = http.expectOne(`${url}/1`)
    expect(request.request.method).toBe('PUT')
    expect(request.request.body).toEqual(preset)
    request.flush({ ...preset, id: 1 })
  })

  it('deletes a preset', () => {
    service.delete(1).subscribe()
    const request = http.expectOne(`${url}/1`)
    expect(request.request.method).toBe('DELETE')
    request.flush(true)
  })

  it('merges presets', () => {
    service.merge([preset]).subscribe()
    const request = http.expectOne(`${url}/merge`)
    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual([preset])
    request.flush([{ ...preset, id: 1 }])
  })
})
