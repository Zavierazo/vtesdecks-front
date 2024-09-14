import { CommonModule } from '@angular/common';
import { DeckCardModule } from '../deck-card/deck-card.module';
import { DecksComponent } from './decks.component';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DeckFiltersComponent } from './filter/deck-filters.component';
import { DeckSharedModule } from '../deck-shared/deck-shared.module';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { CardProportionComponent } from './filter/card-proportion/card-proportion.component';
import { CardFilterComponent } from './filter/card-filter/card-filter.component';
import { decksResolver } from './decks.resolver';
import { TranslocoModule } from '@ngneat/transloco';

const routes: Routes = [
  {
    path: '',
    component: DecksComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Decks',
    resolve: { decks: decksResolver },
  },
];

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
    InfiniteScrollDirective,
    ReactiveFormsModule,
    TranslocoModule,
    RouterModule.forChild(routes),
  ],
})
export class DecksModule {}
