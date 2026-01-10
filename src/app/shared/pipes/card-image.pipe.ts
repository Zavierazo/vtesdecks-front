import { Pipe, PipeTransform } from '@angular/core'
import { ApiI18n } from '@models'
import { getSetAbbrev } from '@utils'
import { environment } from '../../../environments/environment'

@Pipe({ name: 'cardImage' })
export class CardImagePipe implements PipeTransform {
  transform(
    card: { id: number; i18n?: ApiI18n; image?: string },
    set?: string,
  ): string {
    if (set) {
      const setAbbrev = getSetAbbrev(set).toLocaleLowerCase()
      return `${environment.cdnDomain}/img/cards/sets/${setAbbrev}/${card.id}.jpg`
    } else if (card.i18n && card.i18n.image) {
      return environment.i18nCdnDomain + card.i18n.image
    } else if (card.image) {
      return environment.cdnDomain + card.image
    } else {
      const cdnDomain = environment.cdnDomain
      return `${cdnDomain}/img/cards/${card.id}.jpg`
    }
  }
}
