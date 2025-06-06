import { Routes } from '@angular/router'

import { decksResolver } from './decks.resolver'

export const DECKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./decks.component').then(m => m.DecksComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Decks',
    resolve: { decks: decksResolver },
  },
]
