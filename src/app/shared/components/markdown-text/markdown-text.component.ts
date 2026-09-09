import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { MarkdownService } from '@services'

@Component({
  selector: 'app-markdown-text',
  templateUrl: './markdown-text.component.html',
  styleUrls: ['./markdown-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownTextComponent {
  private readonly markdownService = inject(MarkdownService)

  data = input<string>()

  parsedHtml = computed(() => this.markdownService.render(this.data() ?? ''))
}
