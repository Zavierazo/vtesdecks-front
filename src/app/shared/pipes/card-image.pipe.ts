import { inject, Pipe, PipeTransform } from '@angular/core'
import { ApiI18n } from '@models'
import { getSetAbbrev } from '@utils'
import { environment } from '@environments/environment'
import { CardImageSetService } from '../../services/card-image-set.service'

@Pipe({ name: 'cardImage' })
export class CardImagePipe implements PipeTransform {
  private readonly cardImageSetService = inject(CardImageSetService)

  transform(
    card: { id: number; i18n?: ApiI18n; image?: string; sets?: string[] },
    set?: string,
  ): string {
    const cdnDomain = environment.cdnDomain
    const resolvedSet = set || this.cardImageSetService.resolveSet(card)
    if (resolvedSet) {
      const setAbbrev = getSetAbbrev(resolvedSet).toLocaleLowerCase()
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
