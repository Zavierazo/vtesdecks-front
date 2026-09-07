import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'
import { userResolver } from './user.resolver'

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
    resolve: { user: userResolver },
    title: 'VTES Decks - User Profile',
  },
]
