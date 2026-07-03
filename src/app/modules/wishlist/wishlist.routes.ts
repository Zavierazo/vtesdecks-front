import { Routes } from '@angular/router'
import { CanActivateUser } from '@shared/guards/can-activate-user.guard'

export const WISHLIST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./wishlist/wishlist.component').then((m) => m.WishlistComponent),
    pathMatch: 'full',
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Wishlist',
  },
]
