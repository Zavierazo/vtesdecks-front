import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router'
import { EMPTY, Observable, catchError } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { DeckService } from '../../state/deck/deck.service'

export const deckResolver: ResolveFn<ApiDeck> = (
  route: ActivatedRouteSnapshot,
): Observable<ApiDeck> => {
  const id = route.paramMap.get('id')
  const deckService = inject(DeckService)
  return deckService.getDeck(id!).pipe(catchError(() => EMPTY))
}
