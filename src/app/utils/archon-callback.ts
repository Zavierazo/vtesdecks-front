import { HttpErrorResponse } from '@angular/common/http'
import { ApiArchonCallback } from '../models/api-archon'

declare global {
  interface Window {
    __archonCallback?: ApiArchonCallback
  }
}

export function takeArchonCallback(): ApiArchonCallback | undefined {
  const callback = window.__archonCallback
  delete window.__archonCallback
  return callback
}

export function archonErrorKey(error: HttpErrorResponse): string {
  switch (error.status) {
    case 400:
      return 'invalid_attempt'
    case 401:
    case 403:
      return 'session_changed'
    case 409:
      return 'identity_in_use'
    case 422:
      return 'vekn_missing'
    default:
      return 'error'
  }
}
