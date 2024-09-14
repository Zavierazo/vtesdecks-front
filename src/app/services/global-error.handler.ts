import { HttpErrorResponse } from '@angular/common/http'
import { ErrorHandler, Injectable, Injector } from '@angular/core'
import { ApiDataService } from './api.data.service'

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Error handling is important and needs to be loaded first.
  // Because of this we should manually inject the services with Injector.
  constructor(private injector: Injector) {}

  handleError(error: Error | HttpErrorResponse) {
    console.warn(error)
    const apiService = this.injector.get(ApiDataService)
    if (error instanceof HttpErrorResponse) {
      //Server Error
      apiService.sendError(error.message).subscribe()
    } else {
      //Client Error
      apiService
        .sendError(
          error.message ? error.message : error.toString() + ' ' + error.stack,
        )
        .subscribe()
    }
  }
}
