import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  inject,
  output,
  signal,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { DeckSnapshotV1 } from '../../../models/deck-snapshot'
import { DeckShareService } from '../../../services/deck-share.service'
import { encodeSnapshot } from '../../../utils/deck-snapshot'

@Component({
  selector: 'app-share-deck',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, NgbDropdownModule, NgbPopover],
  templateUrl: './share-deck.component.html',
  styleUrls: ['./share-deck.component.scss'],
})
export class ShareDeckComponent implements OnDestroy {
  private readonly shareService = inject(DeckShareService)
  readonly shareDeck = output<void>()
  @Input() disabled = false
  readonly url = signal('')
  readonly failed = signal(false)
  private fingerprint?: string
  private generation = 0

  @Input({ required: true }) set snapshot(value: DeckSnapshotV1) {
    const fingerprint = JSON.stringify(value)
    if (fingerprint === this.fingerprint) {
      return
    }
    this.fingerprint = fingerprint
    const generation = ++this.generation
    this.url.set('')
    this.failed.set(false)
    void encodeSnapshot(value)
      .then((fragment) => {
        if (generation === this.generation) {
          this.url.set(
            new URL(`/deck/snapshot#${fragment}`, window.location.origin).href,
          )
        }
      })
      .catch(() => {
        if (generation === this.generation) {
          this.failed.set(true)
        }
      })
  }

  shareSnapshot(): void {
    if (this.url()) {
      void this.shareService.share(this.url())
    }
  }

  ngOnDestroy(): void {
    ++this.generation
  }
}
