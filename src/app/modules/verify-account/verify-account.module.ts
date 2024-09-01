import { VerifyAccountComponent } from './verify-account.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: VerifyAccountComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Verify Account',
  },
];

@NgModule({
  declarations: [VerifyAccountComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class VerifyAccountModule {}
