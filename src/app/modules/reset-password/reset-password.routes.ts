import { Routes } from '@angular/router'


export const RESET_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reset-password.component').then(m => m.ResetPasswordComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Reset Password',
  },
]
