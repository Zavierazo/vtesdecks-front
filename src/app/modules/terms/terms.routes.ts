import { Routes } from '@angular/router'


export const TERMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./terms.component').then(m => m.TermsComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Terms',
  },
]
