import { Pipe, PipeTransform } from '@angular/core'

const CONTINENT_REGIONS: Readonly<Record<string, string>> = {
  AF: '002',
  AN: 'AQ',
  AS: '142',
  EU: '150',
  NA: '003',
  OC: '009',
  SA: '005',
}

@Pipe({
  name: 'displayCountry',
})
export class CountryPipe implements PipeTransform {
  transform(
    country?: string | null,
    locale = 'en',
    type: 'country' | 'continent' = 'country',
  ): string | undefined {
    if (!country?.trim()) {
      return undefined
    }
    const code = country.trim().toUpperCase()
    const region = type === 'continent' ? CONTINENT_REGIONS[code] : code
    if (!region) {
      return code
    }
    try {
      return (
        new Intl.DisplayNames(locale, { type: 'region', fallback: 'code' }).of(
          region,
        ) ?? country
      )
    } catch {
      return country
    }
  }
}
