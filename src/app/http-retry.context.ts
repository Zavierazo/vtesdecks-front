import { HttpContextToken } from '@angular/common/http'

/** Opts a POST whose repeated execution is safe into transient-error retries. */
export const RETRY_REPEATABLE_POST = new HttpContextToken<boolean>(() => false)
