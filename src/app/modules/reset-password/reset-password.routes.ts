import { Routes } from '@angular/router'
import { ResetPasswordComponent } from './reset-password.component'

export const RESET_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    component: ResetPasswordComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Reset Password',
  },
]
