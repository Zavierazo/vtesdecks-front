import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  ResolveFn,
  RouterStateSnapshot,
} from '@angular/router';
import { Observable } from 'rxjs';
import { ApiDecks } from '../../models/api-decks';
import { DecksService } from '../../state/decks/decks.service';

export const decksResolver: ResolveFn<ApiDecks> = (
  route: ActivatedRouteSnapshot
): Observable<ApiDecks> => {
  const decksService = inject(DecksService);
  decksService.init(route.queryParams);
  return decksService.getMore();
};
