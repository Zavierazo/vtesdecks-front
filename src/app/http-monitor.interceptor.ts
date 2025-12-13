import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { Observable, retry, tap, timer } from 'rxjs'
import { environment } from '../environments/environment'
import { ToastService } from './services/toast.service'
import { AuthStore } from './state/auth/auth.store'

export const retryCount = 10
export const retryWaitMilliSeconds = 5000

@Injectable()
export class HttpMonitorInterceptor implements HttpInterceptor {
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)
  private authStore = inject(AuthStore)

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const isApiRequest = request?.url?.includes(environment.apiDomain)
    if (!isApiRequest) {
      return next.handle(request)
    }

    const httpRequest = request.clone({
      // Workarround to avoid 504 errors
      headers: request.headers
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('Expires', '0'),
      // Add locale param to all api requests
      params: request.params
        .set('locale', this.translocoService.getActiveLang())
        .set('version', environment.appVersion),
    })
    return next.handle(httpRequest).pipe(
      tap((event) => this.updateServerDate(event)),
      retry({ count: retryCount, delay: (error) => this.shouldRetry(error) }),
    )
  }

  shouldRetry(error: HttpErrorResponse) {
    if (
      !error.url?.includes('/ai/') && //TODO: remove when ai endpoint is stable
      (error.status === 503 || error.status === 504 || error.status === 0)
    ) {
      console.warn('Error ' + error.status + ' retrying...')
      this.toastService.show(
        this.translocoService.translate(
          'shared.service_temporarily_unavailable',
        ),
        { classname: 'bg-danger text-light', delay: 5000 },
      )
      return timer(retryWaitMilliSeconds)
    }
    throw error
  }

  updateServerDate(event: HttpEvent<unknown>) {
    if (event instanceof HttpResponse) {
      const dateHeader = event.headers.get('Date')
      if (dateHeader) {
        this.authStore.updateServerDate(new Date(dateHeader))
      }
    }
  }
}
