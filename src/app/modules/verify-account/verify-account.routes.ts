import { Routes } from '@angular/router'
import { VerifyAccountComponent } from './verify-account.component'

export const VERIFY_ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    component: VerifyAccountComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Verify Account',
  },
]
