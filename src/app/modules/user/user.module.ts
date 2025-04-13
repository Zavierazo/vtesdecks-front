import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { SharedModule } from '../../shared/shared.module'
import { DeckCardModule } from '../deck-card/deck-card.module'
import { ProfileComponent } from './profile/profile.component'

const routes: Routes = [
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [CanActivateUser],
    title: 'VTES Decks - Profile',
  },
]

@NgModule({
  declarations: [ProfileComponent],
  imports: [
    CommonModule,
    NgbModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    SharedModule,
    DeckCardModule,
    TranslocoModule,
  ],
})
export class UserModule {}
