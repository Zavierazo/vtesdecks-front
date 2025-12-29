import { Routes } from '@angular/router'

export const DECK_ARCHETYPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./deck-archetypes.component').then(
        (m) => m.DeckArchetypesComponent,
      ),
    pathMatch: 'full',
    title: 'VTES Decks - Archetypes',
  },
]
