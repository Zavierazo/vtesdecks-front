import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http'
import { Injectable } from '@angular/core'
import { TranslocoService } from '@ngneat/transloco'
import { concatMap, delay, Observable, of, retryWhen, throwError } from 'rxjs'
import { environment } from '../environments/environment'
import { ToastService } from './services/toast.service'

export const retryCount = 10
export const retryWaitMilliSeconds = 5000

@Injectable()
export class HttpMonitorInterceptor implements HttpInterceptor {
  constructor(
    private toastService: ToastService,
    private translocoService: TranslocoService,
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    const isApiRequest = request?.url?.includes(environment.apiDomain)
    const httpRequest = request?.clone({
      // Workarround to avoid 504 errors
      headers: request.headers
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('Expires', '0'),
      // Add locale param to all api requests
      params: request.params.set(
        'locale',
        this.translocoService.getActiveLang(),
      ),
    })

    return next.handle(isApiRequest ? httpRequest : request).pipe(
      retryWhen((error) =>
        error.pipe(
          delay(retryWaitMilliSeconds),
          concatMap((error, count) => {
            if (
              count <= retryCount &&
              !error.url.startsWith('https://api.krcg.org') &&
              (error.status === 503 ||
                error.status === 504 ||
                error.status === 0)
            ) {
              console.warn('Error ' + error.status + ' retrying...')
              this.toastService.show(
                this.translocoService.translate(
                  'shared.service_temporarily_unavailable',
                ),
                {
                  classname: 'bg-danger text-light',
                  delay: 5000,
                },
              )
              return of(error)
            }
            return throwError(() => error)
          }),
        ),
      ),
    )
  }

  getLocaleRequest(request: HttpRequest<unknown>): HttpRequest<unknown> {
    return request.clone({
      params: request.params.set(
        'locale',
        this.translocoService.getActiveLang(),
      ),
    })
  }
}
