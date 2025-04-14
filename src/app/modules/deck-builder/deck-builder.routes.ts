import { Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { CanDeactivateComponent } from '../../shared/guards/can-deactivate-component.guard'
import { BuilderComponent } from './builder.component'
import { CryptSectionComponent } from './crypt-section/crypt-section.component'
import { cryptSectionResolver } from './crypt-section/crypt-section.resolver'
import { LibrarySectionComponent } from './library-section/library-section.component'
import { librarySectionResolver } from './library-section/library-section.resolver'

export const DECK_BUILDER_ROUTES: Routes = [
  {
    path: '',
    component: BuilderComponent,
    pathMatch: 'full',
    canActivate: [CanActivateUser],
    canDeactivate: [CanDeactivateComponent],
    title: 'VTES Decks - Builder',
  },
  {
    path: 'crypt',
    component: CryptSectionComponent,
    title: 'VTES Decks - Crypt',
    resolve: { crypt: cryptSectionResolver },
  },
  {
    path: 'library',
    component: LibrarySectionComponent,
    title: 'VTES Decks - Library',
    resolve: { library: librarySectionResolver },
  },
]
