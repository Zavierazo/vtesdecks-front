import { Routes } from '@angular/router'

export const PROXY_GENERATOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./proxy-generator.component').then(
        (m) => m.ProxyGeneratorComponent,
      ),
    pathMatch: 'full',
    title: 'VTES Decks - Proxy Generator',
  },
]
