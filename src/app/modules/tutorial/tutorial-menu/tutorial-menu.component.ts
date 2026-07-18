import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { SeoService } from '@services'
import { TutorialStore } from '../state/tutorial.store'

/** Landing page: what the tutorial is, chapter list, start/continue. */
@Component({
  selector: 'app-tutorial-menu',
  templateUrl: './tutorial-menu.component.html',
  styleUrls: ['./tutorial-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink],
})
export class TutorialMenuComponent implements OnInit {
  private readonly seoService = inject(SeoService)
  private readonly router = inject(Router)
  readonly store = inject(TutorialStore)

  ngOnInit(): void {
    this.seoService.update({
      title: 'Learn to Play VTES – Interactive Tutorial',
      description:
        'Learn Vampire: The Eternal Struggle in 20 minutes with a free interactive tutorial: play a guided first game right in your browser.',
      canonicalUrl: 'https://vtesdecks.com/tutorial',
    })
  }

  playChapter(index: number): void {
    this.store.goToChapter(index)
    this.router.navigate(['/tutorial/play'])
  }

  isCompleted(chapterId: string): boolean {
    return this.store.progress$().completedChapters.includes(chapterId)
  }
}
