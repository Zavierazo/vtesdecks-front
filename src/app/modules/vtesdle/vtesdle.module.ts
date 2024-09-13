import { SharedModule } from './../../shared/shared.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VtesdleComponent } from './vtesdle.component';
import { RouterModule, Routes } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { DeckSharedModule } from '../deck-shared/deck-shared.module';
import { TranslocoModule } from '@ngneat/transloco';

const routes: Routes = [
  {
    path: '',
    component: VtesdleComponent,
    pathMatch: 'full',
    title: 'VTES Decks - VTESDLE',
  },
];

@NgModule({
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    DeckSharedModule,
    ReactiveFormsModule,
    NgxSkeletonLoaderModule,
    TranslocoModule,
    RouterModule.forChild(routes),
  ],
  declarations: [VtesdleComponent],
})
export class VtesdleModule {}
