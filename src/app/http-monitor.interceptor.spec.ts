import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpContext,
  HttpRequest,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { TranslocoService } from '@jsverse/transloco'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { environment } from '@environments/environment'
import { ToastService } from './services/toast.service'
import { AuthStore } from './state/auth/auth.store'
import {
  HttpMonitorInterceptor,
  isRetryableRequest,
} from './http-monitor.interceptor'
import { RETRY_REPEATABLE_POST } from './http-retry.context'

describe('HttpMonitorInterceptor retry policy', () => {
  it('retries GET and HEAD requests', () => {
    expect(isRetryableRequest(new HttpRequest('GET', '/cards'))).toBe(true)
    expect(isRetryableRequest(new HttpRequest('HEAD', '/cards'))).toBe(true)
  })

  it('retries only explicitly repeatable POST requests', () => {
    expect(isRetryableRequest(new HttpRequest('POST', '/cards', {}))).toBe(
      false,
    )
    expect(
      isRetryableRequest(
        new HttpRequest(
          'POST',
          '/cards/search',
          {},
          {
            context: new HttpContext().set(RETRY_REPEATABLE_POST, true),
          },
        ),
      ),
    ).toBe(true)
  })

  it('never retries PUT, PATCH, or DELETE even if opted in', () => {
    const context = new HttpContext().set(RETRY_REPEATABLE_POST, true)
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      expect(
        isRetryableRequest(
          new HttpRequest(method, '/cards/1', {}, { context }),
        ),
      ).toBe(false)
    }
  })

  describe('intercepted requests', () => {
    function setup() {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptorsFromDi()),
          provideHttpClientTesting(),
          {
            provide: HTTP_INTERCEPTORS,
            useClass: HttpMonitorInterceptor,
            multi: true,
          },
          {
            provide: TranslocoService,
            useValue: {
              getActiveLang: () => 'en',
              translate: (key: string) => key,
            },
          },
          { provide: ToastService, useValue: { show: vi.fn() } },
          { provide: AuthStore, useValue: { updateServerDate: vi.fn() } },
        ],
      })
      return {
        httpClient: TestBed.inject(HttpClient),
        controller: TestBed.inject(HttpTestingController),
      }
    }

    afterEach(() => TestBed.inject(HttpTestingController).verify())

    it('issues a mutation only once when its response is lost', () => {
      const { httpClient, controller } = setup()
      const error = vi.fn()
      const url = `${environment.api.baseUrl}/user/collections/cards?locale=en&version=${environment.appVersion}`

      httpClient
        .post(`${environment.api.baseUrl}/user/collections/cards`, {})
        .subscribe({ error })
      controller.expectOne(url).error(new ProgressEvent('network error'))

      expect(error).toHaveBeenCalledOnce()
      controller.expectNone(url)
    })

    it('retries an eligible GET after the configured delay', async () => {
      vi.useFakeTimers()
      try {
        const { httpClient, controller } = setup()
        const next = vi.fn()
        const url = `${environment.api.baseUrl}/cards?locale=en&version=${environment.appVersion}`

        httpClient.get(`${environment.api.baseUrl}/cards`).subscribe({ next })
        controller.expectOne(url).error(new ProgressEvent('network error'))
        await vi.advanceTimersByTimeAsync(5000)
        controller.expectOne(url).flush({ ok: true })

        expect(next).toHaveBeenCalledWith({ ok: true })
      } finally {
        vi.useRealTimers()
      }
    })

    it('retries an opted-in POST after the configured delay', async () => {
      vi.useFakeTimers()
      try {
        const { httpClient, controller } = setup()
        const next = vi.fn()
        const requestUrl = `${environment.api.baseUrl}/cards/search`
        const interceptedUrl = `${requestUrl}?locale=en&version=${environment.appVersion}`
        const context = new HttpContext().set(RETRY_REPEATABLE_POST, true)

        httpClient.post(requestUrl, {}, { context }).subscribe({ next })
        controller
          .expectOne(interceptedUrl)
          .error(new ProgressEvent('network error'))
        await vi.advanceTimersByTimeAsync(5000)
        controller.expectOne(interceptedUrl).flush({ ok: true })

        expect(next).toHaveBeenCalledWith({ ok: true })
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
