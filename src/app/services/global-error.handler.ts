import { HttpErrorResponse } from '@angular/common/http'
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core'
import * as Sentry from '@sentry/angular'
import { AuthQuery } from '../state/auth/auth.query'
import { ApiDataService } from './api.data.service'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector)

  // Sentry Error Handler
  private readonly sentryErrorHandler = Sentry.createErrorHandler({
    showDialog: false,
  })

  handleError(error: Error | HttpErrorResponse) {
    this.sentryErrorHandler.handleError(error)
    console.warn(error)
    const apiService = this.injector.get(ApiDataService)
    const authQuery = this.injector.get(AuthQuery)
    let message = error.message ? error.message : JSON.stringify(error)
    let stackTrace
    if (error instanceof HttpErrorResponse) {
      stackTrace = JSON.stringify(error)
    } else {
      stackTrace = error.stack
    }
    apiService
      .sendError(
        `User: ${authQuery.getUser()} \nError: ${message} \nStack: ${stackTrace}`,
      )
      .subscribe()
  }
}
