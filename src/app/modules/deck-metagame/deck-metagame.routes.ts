import { Routes } from '@angular/router'

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
    title: 'VTES Decks - Archetype',
  },
]
