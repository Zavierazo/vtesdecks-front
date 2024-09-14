import { PrivacyPolicyComponent } from './privacy-policy.component'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { CommonModule } from '@angular/common'

const routes: Routes = [
  {
    path: '',
    component: PrivacyPolicyComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Privacy Policy',
  },
]

@NgModule({
  declarations: [PrivacyPolicyComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class PrivacyPolicyModule {}
