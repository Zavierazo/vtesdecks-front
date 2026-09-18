import { HttpContextToken } from '@angular/common/http'

/** Opts a POST whose repeated execution is safe into transient-error retries. */
export const RETRY_REPEATABLE_POST = new HttpContextToken<boolean>(() => false)

/** Background catalog refreshes must fail quietly without delaying local content. */
export const BACKGROUND_REFRESH = new HttpContextToken<boolean>(() => false)
