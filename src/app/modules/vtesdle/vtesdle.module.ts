import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { DeckSharedModule } from '../deck-shared/deck-shared.module'
import { SharedModule } from './../../shared/shared.module'
import { VtesdleComponent } from './vtesdle.component'

const routes: Routes = [
  {
    path: '',
    component: VtesdleComponent,
    pathMatch: 'full',
    title: 'VTES Decks - VTESDLE',
  },
]

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
