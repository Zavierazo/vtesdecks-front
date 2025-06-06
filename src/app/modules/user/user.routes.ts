import { Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'


export const USER_ROUTES: Routes = [
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Profile',
  },
]
