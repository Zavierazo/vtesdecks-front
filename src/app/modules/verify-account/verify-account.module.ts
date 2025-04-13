import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { SharedModule } from '../../shared/shared.module'
import { VerifyAccountComponent } from './verify-account.component'

const routes: Routes = [
  {
    path: '',
    component: VerifyAccountComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Verify Account',
  },
]

@NgModule({
  declarations: [VerifyAccountComponent],
  imports: [
    CommonModule,
    SharedModule,
    TranslocoModule,
    RouterModule.forChild(routes),
  ],
})
export class VerifyAccountModule {}
