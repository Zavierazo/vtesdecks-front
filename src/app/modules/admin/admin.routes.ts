import { Routes } from '@angular/router'
import { CanActivateAdmin } from '@shared/guards/can-activate-admin.guard'

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [CanActivateAdmin],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./feature-flags/feature-flags.component').then(
            (m) => m.FeatureFlagsComponent,
          ),
        title: 'VTES Decks - Admin',
      },
    ],
  },
]
