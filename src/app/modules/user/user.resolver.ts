import { inject } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router'
import { ApiPublicUser } from '@models'
import { ApiDataService } from '@services'
import { redirectNotFound } from '@utils'

export const userResolver: ResolveFn<ApiPublicUser> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const apiDataService = inject(ApiDataService)
  const router = inject(Router)
  const username = route.paramMap.get('username')!
  return redirectNotFound(
    apiDataService.getPublicUser(username),
    router,
    state.url,
  )
}
