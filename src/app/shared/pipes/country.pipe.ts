import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'displayCountry',
})
export class CountryPipe implements PipeTransform {
  transform(country?: string | null, locale = 'en'): string | undefined {
    if (!country?.trim()) {
      return undefined
    }
    try {
      return (
        new Intl.DisplayNames(locale, { type: 'region', fallback: 'code' }).of(
          country.toUpperCase(),
        ) ?? country
      )
    } catch {
      return country
    }
  }
}
