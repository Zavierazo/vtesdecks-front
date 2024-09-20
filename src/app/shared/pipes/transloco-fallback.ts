import { Pipe, PipeTransform } from '@angular/core'
import { TranslocoService } from '@ngneat/transloco'

@Pipe({
  name: 'translocoFallback',
})
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
