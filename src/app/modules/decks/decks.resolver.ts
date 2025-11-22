import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router'
import { ApiDecks } from '@models'
import { DecksService } from '@state/decks/decks.service'
import { Observable } from 'rxjs'

export const decksResolver: ResolveFn<ApiDecks> = (
  route: ActivatedRouteSnapshot,
): Observable<ApiDecks> => {
  const decksService = inject(DecksService)
  decksService.init(route.queryParams)
  return decksService.getMore()
}
