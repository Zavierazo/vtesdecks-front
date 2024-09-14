import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ResetPasswordComponent } from './reset-password.component'
import { RouterModule, Routes } from '@angular/router'
import { SharedModule } from '../../shared/shared.module'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ReactiveFormsModule } from '@angular/forms'
import { TranslocoModule } from '@ngneat/transloco'

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
