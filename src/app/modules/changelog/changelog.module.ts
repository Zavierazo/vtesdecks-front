import { ChangelogComponent } from './changelog.component'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { CommonModule } from '@angular/common'
import { TranslocoModule, provideTranslocoScope } from '@ngneat/transloco'

const routes: Routes = [
  {
    path: '',
    component: ChangelogComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Changelog',
  },
]

@NgModule({
  declarations: [ChangelogComponent],
  imports: [CommonModule, RouterModule.forChild(routes), TranslocoModule],
})
export class ChangelogModule {}
