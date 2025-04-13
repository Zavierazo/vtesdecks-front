import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { SharedModule } from '../../shared/shared.module'
import { DeckCardModule } from '../deck-card/deck-card.module'
import { DeckRestorableCardModule } from '../deck-restorable-card/deck-restorable-card.module'
import { DeckSharedModule } from '../deck-shared/deck-shared.module'
import { DecksComponent } from './decks.component'
import { decksResolver } from './decks.resolver'
import { CardFilterComponent } from './filter/card-filter/card-filter.component'
import { CardProportionComponent } from './filter/card-proportion/card-proportion.component'
import { DeckFiltersComponent } from './filter/deck-filters.component'

const routes: Routes = [
  {
    path: '',
    component: DecksComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Decks',
    resolve: { decks: decksResolver },
  },
]

@NgModule({
  declarations: [
    DecksComponent,
    DeckFiltersComponent,
    CardProportionComponent,
    CardFilterComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    DeckSharedModule,
    NgbModule,
    NgxSliderModule,
    DeckCardModule,
    DeckRestorableCardModule,
    InfiniteScrollDirective,
    ReactiveFormsModule,
    TranslocoModule,
    RouterModule.forChild(routes),
  ],
})
export class DecksModule {}
