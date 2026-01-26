import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { LazyRenderDirective } from '@shared/directives/lazy-render.directive'
import { MarkdownSanitizePipe } from '@shared/pipes/markdown-sanitize.pipe'
import { MarkdownComponent } from 'ngx-markdown'

@Component({
  selector: 'app-markdown-text',
  templateUrl: './markdown-text.component.html',
  styleUrls: ['./markdown-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarkdownComponent, MarkdownSanitizePipe, LazyRenderDirective],
})
export class MarkdownTextComponent {
  data = input<string>()
}
