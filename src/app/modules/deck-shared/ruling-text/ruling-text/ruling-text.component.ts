import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core'
import { ApiKrcgRuling } from '../../../../models/krcg/api-krcg-ruling'
import { RulingText } from '../../../../models/ruling-text'
import { MediaService } from '../../../../services/media.service'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { NgClass, AsyncPipe } from '@angular/common'

@Component({
  selector: 'app-ruling-text',
  templateUrl: './ruling-text.component.html',
  styleUrls: ['./ruling-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgbPopover, NgClass, AsyncPipe],
})
export class RulingTextComponent implements OnInit {
  private mediaService = inject(MediaService)

  @Input() ruling!: ApiKrcgRuling

  rulingsText: RulingText[] = []

  isMobile$ = this.mediaService.observeMobile()

  ngOnInit() {
    let currentPart = ''
    let currentType: RulingText['type'] | null = null
    const text = this.ruling.text
    for (const char of text) {
      if (currentType === null) {
        if (char === '{') {
          if (currentPart.length > 0) {
            this.rulingsText.push({ type: 'string', text: currentPart })
          }
          currentPart = ''
          currentType = 'card'
        } else if (char === '[') {
          if (currentPart.length > 0) {
            this.rulingsText.push({ type: 'string', text: currentPart })
          }
          currentPart = ''
          currentType = 'reference'
        } else {
          currentPart += char
        }
      } else if (currentType === 'card' && char === '}') {
        this.addCardText(currentPart)
        currentPart = ''
        currentType = null
      } else if (currentType === 'reference' && char === ']') {
        this.addReferenceText(currentPart)
        currentPart = ''
        currentType = null
      } else {
        currentPart += char
      }
    }
    // Add any remaining text outside of formatted parts
    if (currentPart.length > 0) {
      this.rulingsText.push({ type: 'string', text: currentPart })
    }
  }

  private addCardText(currentPart: string) {
    const card = this.ruling.cards.find((card) => card.name === currentPart)
    if (card) {
      this.rulingsText.push({
        type: 'card',
        text: currentPart,
        popoverImage: `/assets/img/cards/${card.id}.jpg`,
      })
    } else {
      this.rulingsText.push({ type: 'card', text: currentPart })
    }
  }

  private addReferenceText(currentPart: string) {
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
  }
}
