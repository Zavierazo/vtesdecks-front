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
          import('./admin.component').then((m) => m.AdminComponent),
        title: 'VTES Decks - Admin',
      },
    ],
  },
]
