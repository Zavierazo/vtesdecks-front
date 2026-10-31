import { Pipe, PipeTransform } from '@angular/core'

export function getLocaleDisplayName(locale?: string): string | undefined {
  if (!locale) {
    return undefined
  }
  try {
    return new Intl.DisplayNames(locale, { type: 'language' }).of(locale)
  } catch {
    return locale
  }
}

@Pipe({ name: 'displayLocale' })
export class LocalePipe implements PipeTransform {
  transform(locale?: string): string | undefined {
    return getLocaleDisplayName(locale)
  }
}
