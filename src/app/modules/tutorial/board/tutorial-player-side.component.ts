import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  TutorialPlayerBoard,
  TutorialPlayerId,
  TutorialTargetId,
  TutorialZoneId,
} from '../state/tutorial-script.model'
import { TutorialTargetDirective } from '../shared/tutorial-target.directive'
import { TutorialCardComponent } from './tutorial-card.component'

/** One player's half of the table: ready, torpor/uncontrolled, piles and pool. */
@Component({
  selector: 'app-tutorial-player-side',
  templateUrl: './tutorial-player-side.component.html',
  styleUrls: ['./tutorial-player-side.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TutorialTargetDirective, TutorialCardComponent],
})
export class TutorialPlayerSideComponent {
  readonly player = input.required<TutorialPlayerId>()
  readonly board = input.required<TutorialPlayerBoard>()
  /** Rival side renders compact (tighter zones). */
  readonly compact = input(false)
  readonly isActive = input(false)
  /** Shows the player's face-down uncontrolled cards face up. */
  readonly revealUncontrolled = input(false)

  readonly poolTarget$ = computed<TutorialTargetId>(
    () => `pool:${this.player()}`,
  )

  readonly edgeTarget$ = computed<TutorialTargetId>(
    () => `edge:${this.player()}`,
  )

  /** Transient pool change indicator for the gain/loss animation. */
  readonly poolDelta$ = signal<number | null>(null)
  private lastPool: number | undefined
  private deltaTimer: ReturnType<typeof setTimeout> | undefined

  constructor() {
    effect(() => {
      const pool = this.board().pool
      if (this.lastPool !== undefined && pool !== this.lastPool) {
        this.poolDelta$.set(pool - this.lastPool)
        clearTimeout(this.deltaTimer)
        this.deltaTimer = setTimeout(() => this.poolDelta$.set(null), 2600)
      }
      this.lastPool = pool
    })
  }

  zoneTarget(zone: TutorialZoneId): TutorialTargetId {
    return `zone:${this.player()}:${zone}`
  }

  cardTarget(ref: string): TutorialTargetId {
    return `card:${ref}`
  }
}
