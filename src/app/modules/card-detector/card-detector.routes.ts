import { Routes } from '@angular/router'
import { CardDetectorComponent } from './card-detector.component'

export const CARD_DETECTOR_ROUTES: Routes = [
  {
    path: '',
    component: CardDetectorComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Card Scanner',
  },
]
