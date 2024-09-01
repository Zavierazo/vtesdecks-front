import { inject } from '@angular/core';
import { ApiDeck } from '../../models/api-deck';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { EMPTY, Observable, catchError } from 'rxjs';
import { DeckService } from '../../state/deck/deck.service';

export const deckResolver: ResolveFn<ApiDeck> = (
  route: ActivatedRouteSnapshot
): Observable<ApiDeck> => {
  const id = route.paramMap.get('id');
  const deckService = inject(DeckService);
  return deckService.getDeck(id!).pipe(catchError(() => EMPTY));
};
