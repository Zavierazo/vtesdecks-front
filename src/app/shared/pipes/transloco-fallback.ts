import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'

@Pipe({ name: 'translocoFallback', standalone: false })
export class TranslocoFallbackPipe implements PipeTransform {
  constructor(private translocoService: TranslocoService) {}

  transform(value: string, fallback: string) {
    const translation = this.translocoService.translate(value)
    if (translation === value) {
      return fallback
    }
    return translation
  }
}
