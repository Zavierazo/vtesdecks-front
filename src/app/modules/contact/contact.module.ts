import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { ContactComponent } from './contact.component'

const routes: Routes = [
  {
    path: '',
    component: ContactComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Contact',
  },
]

@NgModule({
  declarations: [ContactComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    TranslocoModule,
  ],
})
export class ContactModule {}
