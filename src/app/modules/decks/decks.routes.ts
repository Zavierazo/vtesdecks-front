import { Routes } from '@angular/router'
import { DecksComponent } from './decks.component'
import { decksResolver } from './decks.resolver'

export const DECKS_ROUTES: Routes = [
  {
    path: '',
    component: DecksComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Decks',
    resolve: { decks: decksResolver },
  },
]
