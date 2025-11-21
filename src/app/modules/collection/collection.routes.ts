import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'

export const COLLECTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./collection/collection.component').then(
        (m) => m.CollectionComponent,
      ),
    pathMatch: 'full',
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Collection Tracker',
  },
  {
    path: 'binders',
    loadComponent: () =>
      import('./binder-list/binder-list.component').then(
        (m) => m.BinderListComponent,
      ),
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Binders',
  },
  {
    path: 'binders/:binderId',
    loadComponent: () =>
      import('./binder/binder.component').then((m) => m.BinderComponent),
    title: 'VTES Decks - Binder',
  },
]
