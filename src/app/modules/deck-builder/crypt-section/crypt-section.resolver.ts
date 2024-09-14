import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { EMPTY, Observable, catchError } from 'rxjs'
import { ApiCrypt } from '../../../models/api-crypt'
import { CryptService } from '../../../state/crypt/crypt.service'

export const cryptSectionResolver: ResolveFn<ApiCrypt[]> = (): Observable<
  ApiCrypt[]
> => {
  const cryptService = inject(CryptService)
  return cryptService.getCryptCards().pipe(catchError(() => EMPTY))
}
