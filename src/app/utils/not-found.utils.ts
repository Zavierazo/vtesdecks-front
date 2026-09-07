import { RedirectCommand, Router } from '@angular/router'
import { Observable, catchError, of, throwError } from 'rxjs'

export function redirectNotFound<T>(
  request: Observable<T>,
  router: Router,
  requestedUrl: string,
): Observable<T | RedirectCommand> {
  return request.pipe(
    catchError((error: unknown) => {
      if ((error as { status?: number } | null)?.status === 404) {
        return of(
          new RedirectCommand(router.parseUrl('/404'), {
            browserUrl: requestedUrl,
          }),
        )
      }
      return throwError(() => error)
    }),
  )
}
