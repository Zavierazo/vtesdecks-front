import { inject } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router'
import { ApiDeckArchetype, MetaType } from '@models'
import { ApiDataService } from '@services'
import { redirectNotFound } from '@utils'

const validMetaTypes: MetaType[] = [
  'TOURNAMENT',
  'TOURNAMENT_90',
  'TOURNAMENT_180',
  'TOURNAMENT_365',
  'TOURNAMENT_730',
]

export function getArchetypeMetaType(route: ActivatedRouteSnapshot): MetaType {
  const requested = route.queryParamMap.get('metaType') as MetaType | null
  return requested && validMetaTypes.includes(requested)
    ? requested
    : 'TOURNAMENT_365'
}

export const deckMetagameResolver: ResolveFn<ApiDeckArchetype> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const apiDataService = inject(ApiDataService)
  const router = inject(Router)
  const id = Number(route.paramMap.get('id'))
  return redirectNotFound(
    apiDataService.getDeckArchetype(id, getArchetypeMetaType(route)),
    router,
    state.url,
  )
}
