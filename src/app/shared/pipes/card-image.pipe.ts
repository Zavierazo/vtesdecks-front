import { Pipe, PipeTransform } from '@angular/core'
import { environment } from '../../../environments/environment'
import { ApiI18n } from '../../models/api-i18n'

@Pipe({ name: 'cardImage' })
export class CardImagePipe implements PipeTransform {
  transform(
    card: { id: number; i18n?: ApiI18n; image?: string },
    set?: string,
  ): string | undefined {
    if (set) {
      const setAbbrev = set.split(':')[0].toLocaleLowerCase()
      return `${environment.cdnDomain}/img/cards/sets/${setAbbrev}/${card.id}.jpg`
    } else if (card.i18n && card.i18n.image) {
      return environment.cdnDomain + card.i18n.image
    } else if (card.image) {
      return environment.cdnDomain + card.image
    } else {
      return undefined
    }
  }
}
