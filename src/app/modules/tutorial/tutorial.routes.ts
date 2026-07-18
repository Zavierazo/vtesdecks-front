import { Routes } from '@angular/router'
import { provideTranslocoScope } from '@jsverse/transloco'
import { TutorialStore } from './state/tutorial.store'
import { TutorialTargetRegistryService } from './shared/tutorial-target-registry.service'

export const TUTORIAL_ROUTES: Routes = [
  {
    path: '',
    providers: [
      TutorialStore,
      TutorialTargetRegistryService,
      provideTranslocoScope('tutorial'),
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./tutorial-menu/tutorial-menu.component').then(
            (m) => m.TutorialMenuComponent,
          ),
        title: 'VTES Decks - Learn to Play',
      },
      {
        path: 'play',
        loadComponent: () =>
          import('./tutorial-play/tutorial-play.component').then(
            (m) => m.TutorialPlayComponent,
          ),
        title: 'VTES Decks - Learn to Play',
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/tutorial-resources.component').then(
            (m) => m.TutorialResourcesComponent,
          ),
        title: 'VTES Decks - New Player Resources',
      },
    ],
  },
]
