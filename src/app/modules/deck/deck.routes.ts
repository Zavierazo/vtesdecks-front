import { Routes } from '@angular/router'
import { DeckComponent } from './deck.component'
import { deckResolver } from './deck.resolver'

export const DECK_ROUTES: Routes = [
  {
    path: '',
    component: DeckComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Deck',
    resolve: { deck: deckResolver },
  },
]
