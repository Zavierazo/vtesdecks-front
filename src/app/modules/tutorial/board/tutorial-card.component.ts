import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { environment } from '@environments/environment'
import {
  TUTORIAL_CARDS,
  TutorialCard,
} from '../state/tutorial-cards.data'
import { TutorialCardInstance } from '../state/tutorial-script.model'

/** A single card on the tutorial table: scan, blood chip, lock rotation, attachments. */
@Component({
  selector: 'app-tutorial-card',
  templateUrl: './tutorial-card.component.html',
  styleUrls: ['./tutorial-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgbPopover],
})
export class TutorialCardComponent {
  readonly instance = input.required<TutorialCardInstance>()
  /** small = hand/attachments, medium = table default. */
  readonly size = input<'small' | 'medium'>('medium')
  readonly showBlood = input(true)
  /** Temporarily reveals a face-down card (peeking at uncontrolled vampires). */
  readonly forceFaceUp = input(false)

  private readonly cdnDomain = environment.cdnDomain

  readonly card$ = computed<TutorialCard>(
    () => TUTORIAL_CARDS[this.instance().cardKey],
  )

  readonly imageUrl$ = computed(() => {
    const card = this.card$()
    if (this.instance().faceDown && !this.forceFaceUp()) {
      return card.type === 'crypt'
        ? '/assets/img/cardbackcrypt.jpg'
        : '/assets/img/cardbacklibrary.jpg'
    }
    return `${this.cdnDomain}/img/cards/${card.id}.jpg`
  })

  readonly zoomUrl$ = computed(
    () => `${this.cdnDomain}/img/cards/${this.card$().id}.jpg`,
  )

  attachmentUrl(attachment: TutorialCardInstance): string {
    return `${this.cdnDomain}/img/cards/${TUTORIAL_CARDS[attachment.cardKey].id}.jpg`
  }
}
