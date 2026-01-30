import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'

export const USER_ROUTES: Routes = [
  {
    path: 'settings',
    loadComponent: () =>
      import('./user-settings/user-settings.component').then(
        (m) => m.UserSettingsComponent,
      ),
    canActivate: [CanActivateUser],
    title: 'VTES Decks - User Settings',
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
