import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbHighlight } from '@ng-bootstrap/ng-bootstrap'
import { MarkdownSuggestion } from '../markdown-suggestion.service'

@Component({
  selector: 'app-suggestion-list',
  templateUrl: './suggestion-list.component.html',
  styleUrls: ['./suggestion-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, NgbHighlight],
})
export class SuggestionListComponent {
  private readonly elementRef = inject(ElementRef)

  items = input.required<MarkdownSuggestion[]>()
  activeIndex = input<number>(0)
  term = input<string>('')
  emptyKey = input<string>('no_results')
  picked = output<MarkdownSuggestion>()

  constructor() {
    effect(() => {
      const index = this.activeIndex()
      const active =
        this.elementRef.nativeElement.querySelectorAll('.dropdown-item')[index]
      active?.scrollIntoView({ block: 'nearest' })
    })
  }

  onMouseDown(event: MouseEvent): void {
    // Prevent the textarea/input from losing focus when picking with the mouse
    event.preventDefault()
  }
}
