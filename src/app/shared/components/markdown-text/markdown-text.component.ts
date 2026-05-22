import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { MarkdownService } from '@services'
import { MarkdownSanitizePipe } from '@shared/pipes/markdown-sanitize.pipe'

@Component({
  selector: 'app-markdown-text',
  templateUrl: './markdown-text.component.html',
  styleUrls: ['./markdown-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarkdownSanitizePipe],
})
export class MarkdownTextComponent {
  private readonly markdownService = inject(MarkdownService)
  private readonly sanitizer = inject(DomSanitizer)
  private readonly sanitizePipe = inject(MarkdownSanitizePipe)

  data = input<string>()

  parsedHtml = computed(() => {
    const raw = this.data()
    if (!raw) return this.sanitizer.bypassSecurityTrustHtml('')
    return this.sanitizer.bypassSecurityTrustHtml(
      this.markdownService.parse(this.sanitizePipe.transform(raw)),
    )
  })
}
