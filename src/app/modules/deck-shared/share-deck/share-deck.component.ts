import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  output,
  signal,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { DeckSnapshot } from '../../../models/deck-snapshot'
import { DeckShareService } from '../../../services/deck-share.service'
import { encodeSnapshot } from '../../../utils/deck-snapshot'

@Component({
  selector: 'app-share-deck',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, NgbDropdownModule, NgbPopover],
  templateUrl: './share-deck.component.html',
  styleUrls: ['./share-deck.component.scss'],
})
export class ShareDeckComponent {
  private readonly shareService = inject(DeckShareService)
  readonly shareDeck = output<void>()
  @Input() disabled = false
  readonly url = signal('')
  readonly failed = signal(false)
  private fingerprint?: string

  @Input({ required: true }) set snapshot(value: DeckSnapshot) {
    const fingerprint = JSON.stringify(value)
    if (fingerprint === this.fingerprint) {
      return
    }
    this.fingerprint = fingerprint
    this.url.set('')
    this.failed.set(false)
    try {
      this.url.set(new URL(encodeSnapshot(value), window.location.origin).href)
    } catch {
      this.failed.set(true)
    }
  }

  shareSnapshot(): void {
    if (this.url()) {
      void this.shareService.share(this.url())
    }
  }
}
