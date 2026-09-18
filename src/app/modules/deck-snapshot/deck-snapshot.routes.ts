import { Routes } from '@angular/router'

export const DECK_SNAPSHOT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { snapshot: true },
    loadComponent: () =>
      import('../deck/deck.component').then((m) => m.DeckComponent),
  },
]
