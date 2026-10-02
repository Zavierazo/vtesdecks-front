import { DOCUMENT } from '@angular/common'
import { Injectable, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { SearchPresetScope, SearchParams } from '@models'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { buildSearchPath, normalizeSearchParams } from '@utils'
import { AuthQuery } from '@state/auth/auth.query'
import { shareDeckSearch } from '../utils/share-deck-search'
import { ToastService } from './toast.service'

@Injectable({ providedIn: 'root' })
export class SearchFeaturesUiService {
  private readonly authQuery = inject(AuthQuery)
  private readonly toast = inject(ToastService)
  private readonly transloco = inject(TranslocoService)
  private readonly document = inject<Document>(DOCUMENT)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly libraryQuery = inject(LibraryQuery)

  shareLink(scope: SearchPresetScope, params: SearchParams): Promise<boolean> {
    return this.shareSearch(scope, params, true)
  }

  copyLink(scope: SearchPresetScope, params: SearchParams): Promise<boolean> {
    return this.shareSearch(scope, params, false)
  }

  private async shareSearch(
    scope: SearchPresetScope,
    params: SearchParams,
    preferNative: boolean,
  ): Promise<boolean> {
    try {
      const shared =
        scope === 'decks'
          ? shareDeckSearch(params, this.authQuery.getUser())
          : { params, omittedPersonal: false }
      const url = `${this.document.location.origin}${buildSearchPath(scope, shared.params)}`
      const navigator = this.document.defaultView?.navigator
      const nativeShare = preferNative && typeof navigator?.share === 'function'
      if (nativeShare) {
        await navigator.share({ url })
      } else {
        if (!navigator?.clipboard) {
          throw new Error('Clipboard API unavailable')
        }
        await navigator.clipboard.writeText(url)
      }
      if (shared.omittedPersonal || !nativeShare) {
        this.toast.show(
          this.transloco.translate(
            shared.omittedPersonal
              ? 'custom_tags.shared_omitted'
              : 'search_features.copied',
          ),
          { classname: 'bg-success text-light' },
        )
      }
      return true
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'AbortError'
      ) {
        return false
      }
      this.toast.show(
        this.transloco.translate(
          preferNative
            ? 'search_features.share_error'
            : 'search_features.copy_error',
        ),
        {
          classname: 'bg-danger text-light',
        },
      )
      return false
    }
  }

  summary(scope: SearchPresetScope, params: SearchParams): string {
    const entries = Object.entries(normalizeSearchParams(scope, params))
    if (!entries.length) {
      return this.transloco.translate('search_features.default_search')
    }
    const parts = entries.slice(0, 4).map(([key, value]) => {
      const label = this.paramLabel(key)
      return `${label}: ${this.paramValue(scope, key, value)}`
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
    scope: SearchPresetScope,
    key: string,
    value: string,
  ): string {
    if (key === 'sortByOrder') {
      return this.transloco.translate(
        value === 'desc' ? 'shared.descending' : 'shared.ascending',
      )
    }
    if (key === 'order' || (key === 'type' && scope === 'decks')) {
      const translated = this.transloco.translate(
        `decks.${value.toLowerCase()}`,
      )
      return translated === `decks.${value.toLowerCase()}` ? value : translated
    }
    if (key === 'sortBy') {
      const snakeCase = value.replace(/([A-Z])/g, '_$1').toLowerCase()
      const translated = this.transloco.translate(
        `${scope === 'crypt' ? 'crypt_section' : 'library_section'}.${snakeCase}`,
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
