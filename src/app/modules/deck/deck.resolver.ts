import { inject } from '@angular/core'
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router'
import { ApiDeck } from '@models'
import { DeckService } from '@state/deck/deck.service'
import { redirectNotFound } from '@utils'

export const deckResolver: ResolveFn<ApiDeck> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const id = route.paramMap.get('id')
  const deckService = inject(DeckService)
  const router = inject(Router)
  return redirectNotFound(deckService.getDeck(id!), router, state.url)
}
