import { Routes } from '@angular/router'

import { deckResolver } from './deck.resolver'

export const DECK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deck.component').then((m) => m.DeckComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Deck',
    resolve: { deck: deckResolver },
  },
]
