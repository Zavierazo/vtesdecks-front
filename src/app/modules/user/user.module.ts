import { NgModule } from '@angular/core'
import { ProfileComponent } from './profile/profile.component'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { ReactiveFormsModule } from '@angular/forms'
import { DeckCardModule } from '../deck-card/deck-card.module'
import { CommonModule } from '@angular/common'
import { RouterModule, Routes } from '@angular/router'
import { CanActivateUser } from '../../shared/guards/can-activate-user.guard'
import { SharedModule } from '../../shared/shared.module'
import { TranslocoModule } from '@ngneat/transloco'

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
