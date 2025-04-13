import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { ChangelogComponent } from './changelog.component'

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
