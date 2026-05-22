import { inject, Pipe, PipeTransform } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { MarkdownService } from '@services'

@Pipe({
  name: 'markdownRender',
  pure: true,
})
export class MarkdownRenderPipe implements PipeTransform {
  private readonly markdownService = inject(MarkdownService)
  private readonly sanitizer = inject(DomSanitizer)

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return ''
    return this.sanitizer.bypassSecurityTrustHtml(
      this.markdownService.parse(value),
    )
  }
}
