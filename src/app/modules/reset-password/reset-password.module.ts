import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { SharedModule } from '../../shared/shared.module'
import { ResetPasswordComponent } from './reset-password.component'

const routes: Routes = [
  {
    path: '',
    component: ResetPasswordComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Reset Password',
  },
]

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    SharedModule,
    NgbModule,
    ReactiveFormsModule,
    TranslocoModule,
  ],
  declarations: [ResetPasswordComponent],
})
export class ResetPasswordModule {}
