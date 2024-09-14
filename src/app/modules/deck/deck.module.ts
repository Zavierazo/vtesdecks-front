import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import { TranslocoLocaleModule } from '@ngneat/transloco-locale'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { SharedModule } from '../../shared/shared.module'
import { CommentsModule } from '../comments/comments.module'
import { DeckSharedModule } from './../deck-shared/deck-shared.module'
import { DeckComponent } from './deck.component'
import { deckResolver } from './deck.resolver'

const routes: Routes = [
  {
    path: '',
    component: DeckComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Deck',
    resolve: { deck: deckResolver },
  },
]

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
    TranslocoLocaleModule,
  ],
})
export class DeckModule {}
