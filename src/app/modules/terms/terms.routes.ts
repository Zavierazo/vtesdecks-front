import { Routes } from '@angular/router'
import { TermsComponent } from './terms.component'

export const TERMS_ROUTES: Routes = [
  {
    path: '',
    component: TermsComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Terms',
  },
]
