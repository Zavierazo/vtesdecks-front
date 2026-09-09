import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { TutorialStore } from '../state/tutorial.store'

/** Landing page: what the tutorial is, chapter list, start/continue. */
@Component({
  selector: 'app-tutorial-menu',
  templateUrl: './tutorial-menu.component.html',
  styleUrls: ['./tutorial-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink],
})
export class TutorialMenuComponent {
  private readonly router = inject(Router)
  readonly store = inject(TutorialStore)

  playChapter(index: number): void {
    this.store.goToChapter(index)
    this.router.navigate(['/tutorial/play'])
  }

  isCompleted(chapterId: string): boolean {
    return this.store.progress$().completedChapters.includes(chapterId)
  }
}
