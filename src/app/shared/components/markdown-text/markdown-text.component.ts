import {
  Component,
  computed,
  inject,
  input,
  SecurityContext,
  Signal,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { MarkdownComponent } from 'ngx-markdown'

@Component({
  selector: 'app-markdown-text',
  templateUrl: './markdown-text.component.html',
  styleUrls: ['./markdown-text.component.scss'],
  imports: [MarkdownComponent],
})
export class MarkdownTextComponent {
  private readonly sanitizer = inject(DomSanitizer)

  data = input<string>()

  dataSanitized: Signal<string | undefined> = computed(() =>
    this.sanitize(this.data()),
  )

  private sanitize(data?: string): string | undefined {
    return data
      ?.split('\n')
      .map((line: string) => {
        if (line.startsWith('>')) {
          // Fix for markdown quote parser
          return this.sanitizer
            .sanitize(SecurityContext.HTML, line)
            ?.replace(/&gt;/g, '>')
        } else {
          return this.sanitizer.sanitize(SecurityContext.HTML, line)
        }
      })
      .join('\n')
  }
}
