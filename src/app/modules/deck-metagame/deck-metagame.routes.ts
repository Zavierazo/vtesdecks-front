import { Routes } from '@angular/router'
import { deckMetagameResolver } from './deck-metagame.resolver'

export const DECK_METAGAME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deck-metagame.component').then((m) => m.DeckMetagameComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Metagame',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./deck-metagame-detail/deck-metagame-detail.component').then(
        (m) => m.DeckMetagameDetailComponent,
      ),
    resolve: { archetype: deckMetagameResolver },
    title: 'VTES Decks - Archetype',
  },
]
