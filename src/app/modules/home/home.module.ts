import { HomeSectionComponent } from './home-section/home-section.component';
import { HomeComponent } from './home.component';
import { NgModule } from '@angular/core';
import { DeckCardModule } from '../deck-card/deck-card.module';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
    title: 'VTES Decks',
  },
];

@NgModule({
  declarations: [HomeComponent, HomeSectionComponent],
  imports: [
    CommonModule,
    SharedModule,
    NgbModule,
    DeckCardModule,
    RouterModule.forChild(routes),
  ],
  exports: [HomeComponent],
})
export class HomeModule {}
