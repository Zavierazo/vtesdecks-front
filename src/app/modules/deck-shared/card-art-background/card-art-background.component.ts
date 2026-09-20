import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Subscription } from 'rxjs'
import { environment } from '@environments/environment'
import { OfflineImagesService } from '../../../services/offline-images.service'

@UntilDestroy()
@Component({
  selector: 'app-card-art-background',
  styleUrl: './card-art-background.component.scss',
  templateUrl: './card-art-background.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class CardArtBackgroundComponent implements OnChanges {
  private readonly images = inject(OfflineImagesService)
  private subscription?: Subscription

  @Input({ required: true }) cardId!: number
  @Input({ required: true }) type!: 'crypt' | 'library'

  readonly imageUrl = signal('')
  readonly imageWidth = signal(0)

  get crop() {
    return this.type === 'library'
      ? { x: 75, y: 58, width: 259, height: 225 }
      : { x: 75, y: 55, width: 260, height: 333 }
  }

  ngOnChanges(): void {
    this.subscription?.unsubscribe()
    this.imageWidth.set(0)
    this.imageUrl.set('')
    this.subscription = this.images
      .observe(
        `${environment.cdnDomain}/img/cards/${this.cardId}.jpg`,
        undefined,
        '',
      )
      .pipe(untilDestroyed(this))
      .subscribe((url) => {
        if (url !== this.imageUrl()) {
          this.imageWidth.set(0)
          this.imageUrl.set(url)
        }
      })
  }

  onLoad(image: HTMLImageElement): void {
    if (image.getAttribute('src') !== this.imageUrl()) {
      return
    }
    const { x, y, width, height } = this.crop
    this.imageWidth.set(
      image.naturalWidth >= x + width && image.naturalHeight >= y + height
        ? image.naturalWidth
        : 0,
    )
  }

  onError(): void {
    this.imageWidth.set(0)
  }
}
