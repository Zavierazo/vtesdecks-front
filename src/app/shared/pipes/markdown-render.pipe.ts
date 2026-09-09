import { inject, Pipe, PipeTransform } from '@angular/core'
import { SafeHtml } from '@angular/platform-browser'
import { MarkdownService } from '@services'

@Pipe({
  name: 'markdownRender',
  pure: true,
})
export class MarkdownRenderPipe implements PipeTransform {
  private readonly markdownService = inject(MarkdownService)

  transform(value: string | null | undefined): SafeHtml {
    return this.markdownService.render(value ?? '')
  }
}
