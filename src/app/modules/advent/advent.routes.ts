import { Routes } from '@angular/router'

export const ADVENT_ROUTES: Routes = [
  {
    path: '2025',
    loadComponent: () =>
      import('./advent.component').then((m) => m.AdventComponent),
    data: { adventYear: 2025 },
    title: 'Advent Calendar 2025',
  },
  {
    path: '',
    loadComponent: () =>
      import('./advent.component').then((m) => m.AdventComponent),
    pathMatch: 'full',
    title: 'Advent Calendar',
  },
]
