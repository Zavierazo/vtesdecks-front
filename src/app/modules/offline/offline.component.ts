import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { TranslocoPipe } from '@jsverse/transloco'
import { CryptStore } from '@state/crypt/crypt.store'
import { LibraryStore } from '@state/library/library.store'
import { environment } from '@environments/environment'
import { ConnectivityService } from '../../services/connectivity.service'
import { OfflineImagesService } from '../../services/offline-images.service'

@Component({
  selector: 'app-offline',
  templateUrl: './offline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, DecimalPipe],
})
export class OfflineComponent {
  readonly images = inject(OfflineImagesService)
  readonly connection = inject(ConnectivityService)
  readonly crypt = inject(CryptStore)
  readonly library = inject(LibraryStore)
  readonly estimating = signal(false)
  readonly confirmingDelete = signal(false)
  readonly bytes = computed(() =>
    this.images.records().reduce((total, image) => total + image.bytes, 0),
  )
  readonly urls = computed(() =>
    [...this.crypt.entitiesSignal(), ...this.library.entitiesSignal()].map(
      (card) =>
        environment.cdnDomain +
        (card.i18n?.image || card.image || `/img/cards/${card.id}.jpg`),
    ),
  )
  readonly pending = computed(() => {
    const saved = new Set(this.images.records().map((image) => image.id))
    return this.urls().filter((url) => !saved.has(url)).length
  })
  readonly downloadLabel = computed(() => {
    if (this.urls().length && !this.pending()) {
      return 'offline.download'
    }
    return this.pending() < this.urls().length
      ? 'offline.continue_download'
      : 'offline.download'
  })
  async estimate() {
    this.estimating.set(true)
    try {
      await this.images.estimate(this.urls())
    } finally {
      this.estimating.set(false)
    }
  }
  download() {
    void this.images.download(this.urls())
  }
  updateImages() {
    void this.images.download(
      this.images.records().map((image) => image.id),
      true,
    )
  }
  async deleteImages() {
    this.confirmingDelete.set(false)
    await this.images.clear()
  }
}
