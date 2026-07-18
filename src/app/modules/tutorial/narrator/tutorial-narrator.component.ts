import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { TutorialStore } from '../state/tutorial.store'
import { tutorialStepTextKey } from '../state/tutorial-script.model'
import { TutorialEmphasisPipe } from '../shared/tutorial-emphasis.pipe'

/** The guide panel: narration, progress and the controls that advance steps. */
@Component({
  selector: 'app-tutorial-narrator',
  templateUrl: './tutorial-narrator.component.html',
  styleUrls: ['./tutorial-narrator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink, TutorialEmphasisPipe],
})
export class TutorialNarratorComponent {
  readonly store = inject(TutorialStore)

  readonly chapterNumber$ = computed(
    () => this.store.progress$().chapterIndex + 1,
  )
  readonly totalChapters = this.store.script.length

  readonly textKey$ = computed(() =>
    tutorialStepTextKey(
      this.store.currentChapter$().id,
      this.store.currentStep$(),
    ),
  )

  readonly advance$ = computed(() => this.store.currentStep$().advance)

  readonly rivalThinking$ = computed(
    () => this.store.currentStep$().rivalThinking === true,
  )

  optionKey(optionId: string): string {
    // Underscore (not a dot): the step key itself is already a leaf string.
    return `${this.textKey$()}_opt_${optionId}`
  }
}
