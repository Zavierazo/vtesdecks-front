import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'

export const VTES_AI_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./vtes-ai.component').then((m) => m.VtesAiComponent),
    canActivate: [CanActivateUser],
    title: 'VTES Decks - AI Chat',
  },
]
