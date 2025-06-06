import { Routes } from '@angular/router'


export const VERIFY_ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./verify-account.component').then(m => m.VerifyAccountComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Verify Account',
  },
]
