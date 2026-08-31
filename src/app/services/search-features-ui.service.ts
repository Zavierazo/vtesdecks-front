import { DOCUMENT } from '@angular/common'
import { Injectable, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { SearchBrowserType, SearchParams } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { buildSearchPath, normalizeSearchParams } from '@utils'
import { ToastService } from './toast.service'

@Injectable({ providedIn: 'root' })
export class SearchFeaturesUiService {
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly document = inject<Document>(DOCUMENT)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  async copyLink(
    browserType: SearchBrowserType,
    params: SearchParams,
  ): Promise<boolean> {
    const url = `${this.document.location.origin}${buildSearchPath(browserType, params)}`
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard
      if (!clipboard) throw new Error('Clipboard API unavailable')
      await clipboard.writeText(url)
      this.toast.show(this.transloco.translate('search_features.copied'), {
        classname: 'bg-success text-light',
      })
      return true
    } catch {
      this.toast.show(this.transloco.translate('search_features.copy_error'), {
        classname: 'bg-danger text-light',
      })
      return false
    }
  }

  summary(browserType: SearchBrowserType, params: SearchParams): string {
    const entries = Object.entries(normalizeSearchParams(browserType, params))
    if (!entries.length) {
      return this.transloco.translate('search_features.default_search')
    }
    const parts = entries.slice(0, 4).map(([key, value]) => {
      const label = this.paramLabel(key)
      return `${label}: ${this.paramValue(browserType, key, value)}`
    })
    if (entries.length > 4) {
      parts.push(
        this.transloco.translate('search_features.more_filters', {
          count: entries.length - 4,
        }),
      )
    }
    return parts.join(' · ')
  }

  private paramLabel(key: string): string {
    const translated = this.transloco.translate(`search_features.params.${key}`)
    return translated === `search_features.params.${key}`
      ? this.transloco.translate(
          key === 'order' || key === 'sortBy' || key === 'sortByOrder'
            ? 'search_features.sort'
            : 'search_features.filter',
        )
      : translated
  }

  private paramValue(
    browserType: SearchBrowserType,
    key: string,
    value: string,
  ): string {
    if (key === 'sortByOrder') {
      return this.transloco.translate(
        value === 'desc' ? 'shared.descending' : 'shared.ascending',
      )
    }
    if (key === 'order' || (key === 'type' && browserType === 'decks')) {
      const translated = this.transloco.translate(
        `decks.${value.toLowerCase()}`,
      )
      return translated === `decks.${value.toLowerCase()}` ? value : translated
    }
    if (key === 'sortBy') {
      const snakeCase = value.replace(/([A-Z])/g, '_$1').toLowerCase()
      const translated = this.transloco.translate(
        `${browserType === 'crypt' ? 'crypt_section' : 'library_section'}.${snakeCase}`,
      )
      return translated.endsWith(`.${snakeCase}`) ? value : translated
    }
    if (key === 'cards') {
      return value
        .split(',')
        .map((item) => {
          const [id, count = '1'] = item.split('=')
          return `${count}x ${this.cardName(Number(id))}`
        })
        .join(', ')
    }
    if (key === 'excludedCards') {
      return value
        .split(',')
        .map((id) => this.cardName(Number(id)))
        .join(', ')
    }
    return value.replaceAll(',', ', ')
  }

  private cardName(id: number): string {
    const card =
      this.cryptQuery.getEntity(id) ?? this.libraryQuery.getEntity(id)
    return card?.i18n?.name || card?.name || `${id}`
  }
}
