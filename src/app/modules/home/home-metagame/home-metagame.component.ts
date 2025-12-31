import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { DeckMetagameComponent } from '../../deck-metagame/deck-metagame.component'

@Component({
  selector: 'app-home-metagame',
  templateUrl: './home-metagame.component.html',
  styleUrls: ['./home-metagame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DeckMetagameComponent,
    RouterLink,
    TranslocoDirective,
    TranslocoPipe,
    NgbTooltip,
  ],
})
export class HomeMetagameComponent {}
