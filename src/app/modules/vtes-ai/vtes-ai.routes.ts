import { Routes } from '@angular/router'

export const VTES_AI_ROUTES: Routes = [
  {
    path: 'chat',
    loadComponent: () =>
      import('./vtes-ai.component').then((m) => m.VtesAiComponent),
    title: 'VTES Decks - AI Chat',
  },
]
