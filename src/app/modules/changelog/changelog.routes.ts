import { Routes } from '@angular/router'
import { ChangelogComponent } from './changelog.component'

export const CHANGELOG_ROUTES: Routes = [
  {
    path: '',
    component: ChangelogComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Changelog',
  },
]
