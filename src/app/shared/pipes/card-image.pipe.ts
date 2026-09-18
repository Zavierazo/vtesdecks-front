import { OfflineImagesService } from '../../services/offline-images.service'
import {
  ChangeDetectorRef,
  inject,
  OnDestroy,
  Pipe,
  PipeTransform,
} from '@angular/core'
import { ApiI18n } from '@models'
import { getSetAbbrev, isCryptId } from '@utils'
import { environment } from '@environments/environment'
import { CardImageSetService } from '../../services/card-image-set.service'

@Pipe({ name: 'cardImage', pure: false })
export class CardImagePipe implements PipeTransform, OnDestroy {
  private readonly cardImageSetService = inject(CardImageSetService)

  private readonly images = inject(OfflineImagesService)
  private readonly detector = inject(ChangeDetectorRef)
  private readonly consumer = Symbol('card-image-view')
  private url?: string
  private readonly subscription = this.images.changed.subscribe((url) => {
    if (url === this.url) {
      this.detector.markForCheck()
    }
  })

  transform(
    card: { id: number; i18n?: ApiI18n; image?: string; sets?: string[] },
    set?: string,
  ): string {
    const url = this.resolveUrl(card, set)
    if (this.url !== url) {
      if (this.url) {
        this.images.release(this.url, this.consumer)
      }
      this.url = url
      return this.images.acquire(
        url,
        environment.cdnDomain +
          (card.i18n?.image || card.image || `/img/cards/${card.id}.jpg`),
        isCryptId(card.id)
          ? '/assets/img/cardbackcrypt.jpg'
          : '/assets/img/cardbacklibrary.jpg',
        this.consumer,
      )
    }
    return this.images.display(url, this.consumer)
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
    if (this.url) {
      this.images.release(this.url, this.consumer)
    }
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
