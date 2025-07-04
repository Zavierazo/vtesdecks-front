import { Pipe, PipeTransform } from '@angular/core'
import { ApiI18n } from '../../models/api-i18n'

@Pipe({ name: 'cardImage' })
export class CardImagePipe implements PipeTransform {
  transform(card: { id: number; i18n?: ApiI18n; image: string }, set?: string) {
    if (set?.startsWith('Promo')) {
      return `https://statics.bloodlibrary.info/img/sets/promo/${card.id}.jpg`
    } else if (set) {
      const setAbbrev = set.split(':')[0].toLocaleLowerCase()
      return `https://statics.bloodlibrary.info/img/sets/${setAbbrev}/${card.id}.jpg`
    } else if (card.i18n && card.i18n.image) {
      return '/assets' + card.i18n.image
    }
    return '/assets' + card.image
  }
}
