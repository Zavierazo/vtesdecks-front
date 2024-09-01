import { DeckCardComponent } from './deck-card.component';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [DeckCardComponent],
  imports: [CommonModule, NgbModule, SharedModule, RouterModule],
  exports: [DeckCardComponent],
})
export class DeckCardModule {}
