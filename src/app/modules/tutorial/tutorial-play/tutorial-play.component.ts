import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { MediaService, SeoService } from '@services'
import { environment } from '@environments/environment'
import { TUTORIAL_CARDS } from '../state/tutorial-cards.data'
import { TutorialStore } from '../state/tutorial.store'
import { TutorialBoardComponent } from '../board/tutorial-board.component'
import { TutorialCardAnatomyComponent } from '../anatomy/tutorial-card-anatomy.component'
import { TutorialNarratorComponent } from '../narrator/tutorial-narrator.component'
import { TutorialSpotlightComponent } from '../shared/tutorial-spotlight.component'

/** The play page: board (or anatomy view), narrator panel and spotlight overlay. */
@Component({
  selector: 'app-tutorial-play',
  templateUrl: './tutorial-play.component.html',
  styleUrls: ['./tutorial-play.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TutorialBoardComponent,
    TutorialCardAnatomyComponent,
    TutorialNarratorComponent,
    TutorialSpotlightComponent,
  ],
})
export class TutorialPlayComponent implements OnInit {
  private readonly seoService = inject(SeoService)
  private readonly router = inject(Router)
  readonly store = inject(TutorialStore)

  private readonly isMobile$ = toSignal(inject(MediaService).observeMobile(), {
    initialValue: false,
  })

  readonly view$ = computed(() => this.store.currentStep$().view ?? 'board')
  readonly finished$ = computed(() => this.store.progress$().finished)

  /** Big-card presentation shown the first time a new card enters the story. */
  readonly presentCard$ = computed(() => {
    const key = this.store.currentStep$().presentCard
    if (!key) {
      return undefined
    }
    const card = TUTORIAL_CARDS[key]
    return {
      name: card.name,
      url: `${environment.cdnDomain}/img/cards/${card.id}.jpg`,
    }
  })

  /**
   * On steps that both present a card and wait for it to be clicked or
   * dragged, the big presentation doubles as the click target so the player
   * does not have to hunt for the small copy in the hand.
   */
  readonly presentInteractive$ = computed(() => {
    const advance = this.store.currentStep$().advance
    if (advance.type === 'click') {
      return true
    }
    // Once the drag card is lifted, let clicks pass through again so the
    // destination stays reachable even if the overlay covers it.
    return (
      advance.type === 'drag' && this.store.pendingDragRef$() === undefined
    )
  })

  onPresentCardClick(): void {
    const advance = this.store.currentStep$().advance
    if (advance.type === 'click') {
      this.store.clickTarget(advance.target)
    } else if (advance.type === 'drag') {
      this.store.clickTarget(`card:${advance.ref}`)
    }
  }

  constructor() {
    effect(() => {
      if (this.finished$()) {
        this.router.navigate(['/tutorial/resources'])
      }
    })
    // Phones get the one-tap version of drag steps.
    effect(() => this.store.setSimplifiedDrag(this.isMobile$()))
  }

  ngOnInit(): void {
    this.seoService.update({
      title: 'Learn to Play VTES',
      description:
        'Play a guided first game of Vampire: The Eternal Struggle right in your browser.',
      canonicalUrl: 'https://vtesdecks.com/tutorial',
    })
    this.store.startOrResume()
  }
}
