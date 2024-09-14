import { TermsComponent } from './terms.component'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { CommonModule } from '@angular/common'

const routes: Routes = [
  {
    path: '',
    component: TermsComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Terms',
  },
]

@NgModule({
  declarations: [TermsComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class TermsModule {}
