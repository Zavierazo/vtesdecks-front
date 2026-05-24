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
    const cdnDomain = environment.cdnDomain
    if (set) {
      const setAbbrev = getSetAbbrev(set).toLocaleLowerCase()
      return `${cdnDomain}/img/cards/sets/${setAbbrev}/${card.id}.jpg`
    } else if (card.i18n && card.i18n.image) {
      return `${cdnDomain}${card.i18n.image}`
    } else if (card.image) {
      return `${cdnDomain}${card.image}`
    } else {
      return `${cdnDomain}/img/cards/${card.id}.jpg`
    }
  }
}
