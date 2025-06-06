import { Routes } from '@angular/router'

export const PRIVACY_POLICY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
    pathMatch: 'full',
    title: 'VTES Decks - Privacy Policy',
  },
]
