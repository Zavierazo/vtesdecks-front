import { Pipe, PipeTransform, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({ name: 'translocoFallback' })
export class TranslocoFallbackPipe implements PipeTransform {
  private translocoService = inject(TranslocoService);


  transform(value: string, fallback: string) {
    const translation = this.translocoService.translate(value)
    if (translation === value) {
      return fallback
    }
    return translation
  }
}
