import { Routes } from '@angular/router'
import { VtesdleComponent } from './vtesdle.component'

export const VTESDLE_ROUTES: Routes = [
  {
    path: '',
    component: VtesdleComponent,
    pathMatch: 'full',
    title: 'VTES Decks - VTESDLE',
  },
]
