import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { ApiKrcgRuling } from '../../../../models/krcg/api-krcg-ruling'
import { RulingText } from '../../../../models/ruling-text'
import { MediaService } from '../../../../services/media.service'

@Component({
  selector: 'app-ruling-text',
  templateUrl: './ruling-text.component.html',
  styleUrls: ['./ruling-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulingTextComponent implements OnInit {
  @Input() ruling!: ApiKrcgRuling

  rulingsText: RulingText[] = []

  isMobile$ = this.mediaService.observeMobile()

  constructor(private mediaService: MediaService) {}

  ngOnInit() {
    let currentPart = ''
    let currentType: RulingText['type'] | null = null
    const text = this.ruling.text
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (currentType === null) {
        if (char === '{') {
          if (currentPart.length > 0) {
            this.rulingsText.push({ type: 'string', text: currentPart })
            currentPart = ''
          }
          currentPart = ''
          currentType = 'card'
        } else if (char === '[') {
          if (currentPart.length > 0) {
            this.rulingsText.push({ type: 'string', text: currentPart })
            currentPart = ''
          }
          currentPart = ''
          currentType = 'reference'
        } else {
          currentPart += char
        }
      } else {
        if (currentType === 'card' && char === '}') {
          const card = this.ruling.cards.find(
            (card) => card.name === currentPart,
          )
          if (card) {
            this.rulingsText.push({
              type: 'card',
              text: currentPart,
              popoverImage: `/assets/img/cards/${card.id}.jpg`,
            })
          } else {
            this.rulingsText.push({ type: 'card', text: currentPart })
          }
          currentPart = ''
          currentType = null
        } else if (currentType === 'reference' && char === ']') {
          const reference = this.ruling.references.find(
            (ref) => ref.label === currentPart,
          )
          if (reference) {
            this.rulingsText.push({
              type: 'reference',
              text: currentPart,
              link: reference.url,
            })
          } else {
            this.rulingsText.push({ type: 'reference', text: currentPart })
          }
          currentPart = ''
          currentType = null
        } else {
          currentPart += char
        }
      }
    }
    // Add any remaining text outside of formatted parts
    if (currentPart.length > 0) {
      this.rulingsText.push({ type: 'string', text: currentPart })
    }
  }
}
