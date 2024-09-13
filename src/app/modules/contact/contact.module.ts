import { ReactiveFormsModule } from '@angular/forms';
import { ContactComponent } from './contact.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';

const routes: Routes = [
  {
    path: '',
    component: ContactComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Contact',
  },
];

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
