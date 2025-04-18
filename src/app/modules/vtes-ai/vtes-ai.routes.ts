import { Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { VtesAiComponent } from './vtes-ai.component'

export const VTES_AI_ROUTES: Routes = [
  {
    path: 'chat',
    component: VtesAiComponent,
    canActivate: [CanActivateUser],
    title: 'VTES Decks - AI Chat',
  },
]
