import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  TutorialCardInstance,
  TutorialTargetId,
} from '../state/tutorial-script.model'
import { TutorialTargetDirective } from '../shared/tutorial-target.directive'
import { TutorialCardComponent } from './tutorial-card.component'

/** The player's hand, fanned at the bottom of the board. */
@Component({
  selector: 'app-tutorial-hand',
  templateUrl: './tutorial-hand.component.html',
  styleUrls: ['./tutorial-hand.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TutorialTargetDirective, TutorialCardComponent],
})
export class TutorialHandComponent {
  readonly cards = input.required<TutorialCardInstance[]>()

  cardTarget(ref: string): TutorialTargetId {
    return `card:${ref}`
  }
}
