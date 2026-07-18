import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
} from '@angular/core'
import { Router } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { SeoService } from '@services'
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

  readonly view$ = computed(() => this.store.currentStep$().view ?? 'board')
  readonly finished$ = computed(() => this.store.progress$().finished)

  constructor() {
    effect(() => {
      if (this.finished$()) {
        this.router.navigate(['/tutorial/resources'])
      }
    })
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
