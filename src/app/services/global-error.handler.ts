import { HttpErrorResponse } from '@angular/common/http'
import { ErrorHandler, Injectable, Injector } from '@angular/core'
import * as Sentry from '@sentry/angular'
import { AuthQuery } from '../state/auth/auth.query'
import { ApiDataService } from './api.data.service'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Sentry Error Handler
  private readonly sentryErrorHandler = Sentry.createErrorHandler({
    showDialog: false,
  })

  // Error handling is important and needs to be loaded first.
  // Because of this we should manually inject the services with Injector.
  constructor(private readonly injector: Injector) {}

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
