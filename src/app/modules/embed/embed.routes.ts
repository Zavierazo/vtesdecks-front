import { Routes } from '@angular/router'

import { deckResolver } from '../deck/deck.resolver'

export const EMBED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deck-embed.component').then((m) => m.DeckEmbedComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Deck',
    resolve: { deck: deckResolver },
  },
]
