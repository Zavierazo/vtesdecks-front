import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'

export const USER_ROUTES: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Profile',
  },
  {
    path: ':username',
    loadComponent: () =>
      import('./user-public-profile/user-public-profile.component').then(
        (m) => m.UserPublicProfileComponent,
      ),
    title: 'VTES Decks - User Profile',
  },
]
