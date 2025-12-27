import { Pipe, PipeTransform } from '@angular/core'

@Pipe({ name: 'displayLocale' })
export class LocalePipe implements PipeTransform {
  transform(locale?: string): string | undefined {
    if (!locale) {
      return undefined
    }
    return new Intl.DisplayNames(locale, {
      type: 'language',
    }).of(locale)
  }
}
