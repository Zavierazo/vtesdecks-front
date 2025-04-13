import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule } from '@angular/router'
import { TranslocoModule } from '@jsverse/transloco'
import { TranslocoLocaleModule } from '@jsverse/transloco-locale'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { SharedModule } from '../../shared/shared.module'
import { DeckRestorableCardComponent } from './deck-restorable-card.component'

@NgModule({
  declarations: [DeckRestorableCardComponent],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    RouterModule,
    TranslocoModule,
    TranslocoLocaleModule,
  ],
  exports: [DeckRestorableCardComponent],
})
export class DeckRestorableCardModule {}
