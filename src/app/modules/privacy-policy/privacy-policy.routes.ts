import { Routes } from '@angular/router'
import { PrivacyPolicyComponent } from './privacy-policy.component'

export const PRIVACY_POLICY_ROUTES: Routes = [
  {
    path: '',
    component: PrivacyPolicyComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Privacy Policy',
  },
]
