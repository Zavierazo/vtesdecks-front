import {
  Component,
  Injector,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core'
import { createCustomElement } from '@angular/elements'
import { RouterOutlet } from '@angular/router'
import { MarkdownCardComponent } from './shared/components/markdown-card/markdown-card.component'
import { ToastsContainer } from './shared/components/toast-container/toast-container.component'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, ToastsContainer],
})
export class AppComponent {
  title = 'VTES Decks'

  constructor() {
    // Add custom element for markdown cards
    const markdownCard = createCustomElement(MarkdownCardComponent, {
      injector: inject(Injector),
    })
    customElements.define('app-markdown-card', markdownCard)
  }
}
