import { Routes } from '@angular/router'


export const CHANGELOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./changelog.component').then(m => m.ChangelogComponent),
    pathMatch: 'full',
    title: 'VTES Decks - Changelog',
  },
]
