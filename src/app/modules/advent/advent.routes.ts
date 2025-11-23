import { Routes } from '@angular/router'

export const ADVENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./advent.component').then((m) => m.AdventComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Advent 2025',
  },
]
