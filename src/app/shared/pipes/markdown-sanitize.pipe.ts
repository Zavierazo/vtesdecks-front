import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'

@Pipe({
  name: 'markdownSanitize',
  pure: true,
})
export class MarkdownSanitizePipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer)

  transform(value: string | null | undefined): string {
    if (!value) return ''
    return value
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
