import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import { TranslocoLocaleModule } from '@ngneat/transloco-locale'
import { SharedModule } from '../../shared/shared.module'
import { DeckCardComponent } from './deck-card.component'

@NgModule({
  declarations: [DeckCardComponent],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    RouterModule,
    TranslocoModule,
    TranslocoLocaleModule,
  ],
  exports: [DeckCardComponent],
})
export class DeckCardModule {}
