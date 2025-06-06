import { Routes } from '@angular/router'


export const VTESDLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./vtesdle.component').then(m => m.VtesdleComponent),
    pathMatch: 'full',
    title: 'VTES Decks - VTESDLE',
  },
]
