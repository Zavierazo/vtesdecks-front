import { Routes } from '@angular/router'
import { VtesAiComponent } from './vtes-ai.component'

export const VTES_AI_ROUTES: Routes = [
  {
    path: '',
    component: VtesAiComponent,
    pathMatch: 'full',
    title: 'VTES Decks - AI Chat',
  },
]
