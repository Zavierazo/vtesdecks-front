import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { SharedModule } from '../../shared/shared.module'
import { DeckCardModule } from '../deck-card/deck-card.module'
import { HomeSectionComponent } from './home-section/home-section.component'
import { HomeComponent } from './home.component'

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
    title: 'VTES Decks',
  },
]

@NgModule({
  declarations: [HomeComponent, HomeSectionComponent],
  imports: [
    CommonModule,
    SharedModule,
    NgbModule,
    DeckCardModule,
    TranslocoModule,
    RouterModule.forChild(routes),
  ],
  exports: [HomeComponent],
})
export class HomeModule {}
