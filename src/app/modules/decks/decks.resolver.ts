import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router'
import { ApiDecks } from '@models'
import { DecksService } from '@state/decks/decks.service'
import { Observable, of } from 'rxjs'

export const decksResolver: ResolveFn<ApiDecks> = (
  route: ActivatedRouteSnapshot,
): Observable<ApiDecks> => {
  const decksService = inject(DecksService)
  const changed = decksService.init(route.queryParams)
  return changed ? decksService.getMore() : of({} as ApiDecks)
}
