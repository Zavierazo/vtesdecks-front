import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { EMPTY, Observable, catchError } from 'rxjs'
import { LibraryService } from '../../../state/library/library.service'
import { ApiLibrary } from '../../../models/api-library'

export const librarySectionResolver: ResolveFn<ApiLibrary[]> = (): Observable<
  ApiLibrary[]
> => {
  const libraryService = inject(LibraryService)
  return libraryService.getLibraryCards().pipe(catchError(() => EMPTY))
}
