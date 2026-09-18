import { OfflineImagesService } from '../../services/offline-images.service'
import {
  ChangeDetectorRef,
  inject,
  OnDestroy,
  Pipe,
  PipeTransform,
} from '@angular/core'
import { Subscription } from 'rxjs'
import { ApiI18n } from '@models'
import { getSetAbbrev, isCryptId } from '@utils'
import { environment } from '@environments/environment'
import { CardImageSetService } from '../../services/card-image-set.service'

@Pipe({ name: 'cardImage', pure: false })
export class CardImagePipe implements PipeTransform, OnDestroy {
  private readonly cardImageSetService = inject(CardImageSetService)

  private readonly images = inject(OfflineImagesService)
  private readonly detector = inject(ChangeDetectorRef)
  private subscription?: Subscription
  private url?: string
  private image = ''

  transform(
    card: { id: number; i18n?: ApiI18n; image?: string; sets?: string[] },
    set?: string,
  ): string {
    const url = this.resolveUrl(card, set)
    if (url !== this.url) {
      this.subscription?.unsubscribe()
      this.url = url
      this.subscription = this.images
        .observe(
          url,
          environment.cdnDomain +
            (card.i18n?.image || card.image || `/img/cards/${card.id}.jpg`),
          isCryptId(card.id)
            ? '/assets/img/cardbackcrypt.jpg'
            : '/assets/img/cardbacklibrary.jpg',
        )
        .subscribe((image) => {
          this.image = image
          this.detector.markForCheck()
        })
    }
    return this.image
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe()
  }

  resolveUrl(
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
