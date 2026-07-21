import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'
import { environment } from '@environments/environment'
import { TranslocoDirective } from '@jsverse/transloco'
import { TutorialTargetDirective } from '../shared/tutorial-target.directive'
import { TUTORIAL_CARDS, TutorialCardKey } from '../state/tutorial-cards.data'
import { TutorialTargetId } from '../state/tutorial-script.model'

interface AnatomyHotspot {
  target: TutorialTargetId
  top: number
  left: number
  width: number
  height: number
}

/**
 * Percent-positioned hotspots over the real card scans (Aline Gädeke 201576
 * and Legal Manipulations 101089) — tuned against the actual CDN images.
 */
const CRYPT_HOTSPOTS: AnatomyHotspot[] = [
  { target: 'anatomy:name', top: 3, left: 3, width: 58, height: 8 },
  { target: 'anatomy:clan', top: 12.5, left: 3.5, width: 14, height: 10 },
  { target: 'anatomy:disciplines', top: 64, left: 4, width: 14, height: 28 },
  { target: 'anatomy:text', top: 76, left: 18, width: 78, height: 19 },
  { target: 'anatomy:capacity', top: 86, left: 82.5, width: 14, height: 11 },
  // Last so it renders above the text hotspot it slightly overlaps.
  { target: 'anatomy:group', top: 74.5, left: 16.5, width: 8, height: 5.5 },
]

const LIBRARY_HOTSPOTS: AnatomyHotspot[] = [
  { target: 'anatomy:type', top: 14, left: 4.5, width: 14, height: 11 },
  {
    target: 'anatomy:requirement',
    top: 42,
    left: 4.5,
    width: 14,
    height: 11,
  },
  { target: 'anatomy:cost', top: 78, left: 4, width: 14, height: 13 },
  { target: 'anatomy:libtext', top: 60, left: 18, width: 78, height: 35 },
]

/** One real example per library card type (chapter 2 gallery). */
const TYPE_EXAMPLES: { labelKey: string; cardKey: TutorialCardKey }[] = [
  { labelKey: 'master', cardKey: 'bloodDoll' },
  { labelKey: 'action', cardKey: 'legalManipulations' },
  { labelKey: 'modifier', cardKey: 'bonding' },
  { labelKey: 'reaction', cardKey: 'onTheQuiVive' },
  { labelKey: 'combat', cardKey: 'majesty' },
  { labelKey: 'political', cardKey: 'eatTheRich' },
  { labelKey: 'equipment', cardKey: 'magnum' },
  { labelKey: 'ally', cardKey: 'procurer' },
  { labelKey: 'retainer', cardKey: 'mrWinthrop' },
  { labelKey: 'event', cardKey: 'theUnmasking' },
]

/** Chapter 2: card anatomy with clickable hotspots, plus the type gallery. */
@Component({
  selector: 'app-tutorial-card-anatomy',
  templateUrl: './tutorial-card-anatomy.component.html',
  styleUrls: ['./tutorial-card-anatomy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, TutorialTargetDirective],
})
export class TutorialCardAnatomyComponent {
  readonly kind = input.required<'crypt' | 'library' | 'types'>()

  private readonly cdnDomain = environment.cdnDomain

  readonly typeExamples = TYPE_EXAMPLES

  readonly card$ = computed(() =>
    this.kind() === 'crypt'
      ? TUTORIAL_CARDS.aline
      : TUTORIAL_CARDS.legalManipulations,
  )

  readonly imageUrl$ = computed(
    () => `${this.cdnDomain}/img/cards/${this.card$().id}.jpg`,
  )

  readonly hotspots$ = computed(() =>
    this.kind() === 'crypt' ? CRYPT_HOTSPOTS : LIBRARY_HOTSPOTS,
  )

  exampleUrl(cardKey: TutorialCardKey): string {
    return `${this.cdnDomain}/img/cards/${TUTORIAL_CARDS[cardKey].id}.jpg`
  }

  typeTarget(labelKey: string): TutorialTargetId {
    return `anatomy:type-${labelKey}`
  }

  exampleName(cardKey: TutorialCardKey): string {
    return TUTORIAL_CARDS[cardKey].name
  }
}
