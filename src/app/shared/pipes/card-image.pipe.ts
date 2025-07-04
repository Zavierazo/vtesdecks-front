import { Pipe, PipeTransform } from '@angular/core'
import { ApiCrypt } from '../../models/api-crypt'
import { ApiLibrary } from '../../models/api-library'

@Pipe({ name: 'cardImage' })
export class CardImagePipe implements PipeTransform {
  transform(card: ApiCrypt | ApiLibrary, set?: string) {
    if (set) {
      const setAbbrev = set.split(':')[0].toLocaleLowerCase()
      return `https://statics.bloodlibrary.info/img/sets/${setAbbrev}/${card.id}.jpg`
    }
    if (card.i18n && card.i18n.image) {
      return '/assets' + card.i18n.image
    }
    return '/assets' + card.image
  }
}
