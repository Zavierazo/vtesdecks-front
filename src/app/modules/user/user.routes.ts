import { Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { ProfileComponent } from './profile/profile.component'

export const USER_ROUTES: Routes = [
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Profile',
  },
]
