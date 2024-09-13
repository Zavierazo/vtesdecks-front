import { DeckSharedModule } from './../deck-shared/deck-shared.module';
import { DeckComponent } from './deck.component';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CommentsModule } from '../comments/comments.module';
import { SharedModule } from '../../shared/shared.module';
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics';
import { TranslocoModule } from '@ngneat/transloco';
import { deckResolver } from './deck.resolver';

const routes: Routes = [
  {
    path: '',
    component: DeckComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Deck',
    resolve: { deck: deckResolver },
  },
];

@NgModule({
  declarations: [DeckComponent],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    CommentsModule,
    DeckSharedModule,
    RouterModule.forChild(routes),
    NgxGoogleAnalyticsModule,
    TranslocoModule,
  ],
})
export class DeckModule {}
