import { Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { CanDeactivateComponent } from '../../shared/guards/can-deactivate-component.guard'


import { cryptSectionResolver } from './crypt-section/crypt-section.resolver'

import { librarySectionResolver } from './library-section/library-section.resolver'

export const DECK_BUILDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./builder.component').then(m => m.BuilderComponent),
    pathMatch: 'full',
    canActivate: [CanActivateUser],
    canDeactivate: [CanDeactivateComponent],
    title: 'VTES Decks - Builder',
  },
  {
    path: 'crypt',
    loadComponent: () => import('./crypt-section/crypt-section.component').then(m => m.CryptSectionComponent),
    title: 'VTES Decks - Crypt',
    resolve: { crypt: cryptSectionResolver },
  },
  {
    path: 'library',
    loadComponent: () => import('./library-section/library-section.component').then(m => m.LibrarySectionComponent),
    title: 'VTES Decks - Library',
    resolve: { library: librarySectionResolver },
  },
]
