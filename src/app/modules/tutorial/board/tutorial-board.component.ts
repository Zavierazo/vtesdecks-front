import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { TutorialStore } from '../state/tutorial.store'
import { TutorialPhase } from '../state/tutorial-script.model'
import { TutorialTargetDirective } from '../shared/tutorial-target.directive'
import { TutorialHandComponent } from './tutorial-hand.component'
import { TutorialPlayerSideComponent } from './tutorial-player-side.component'

const PHASES: TutorialPhase[] = [
  'unlock',
  'master',
  'minion',
  'influence',
  'discard',
]

/** The two-player demo table: rival on top, you below, hand at the bottom. */
@Component({
  selector: 'app-tutorial-board',
  templateUrl: './tutorial-board.component.html',
  styleUrls: ['./tutorial-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TutorialTargetDirective,
    TutorialHandComponent,
    TutorialPlayerSideComponent,
  ],
})
export class TutorialBoardComponent {
  private readonly store = inject(TutorialStore)

  readonly phases = PHASES
  readonly board$ = this.store.board$
  readonly activePhase$ = computed(() => this.store.board$().phase)
  readonly activePlayer$ = computed(() => this.store.board$().activePlayer)
  readonly revealUncontrolled$ = computed(
    () => this.store.currentStep$().revealUncontrolled === true,
  )
  readonly combat$ = computed(() => this.store.currentStep$().combat)
  readonly combatStages = ['range', 'strike', 'press'] as const
}
