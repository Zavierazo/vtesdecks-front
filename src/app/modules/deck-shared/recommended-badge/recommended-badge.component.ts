import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiArchetypeKeyCard } from '@models'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-recommended-badge',
  templateUrl: './recommended-badge.component.html',
  styleUrls: ['./recommended-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgbTooltip, TranslocoPipe],
})
export class RecommendedBadgeComponent {
  recommended = input.required<ApiArchetypeKeyCard | undefined>()
  current = input<number>(0)

  rangeLabel = computed<string>(() => {
    const rec = this.recommended()
    if (!rec) {
      return ''
    }
    return rec.min === rec.max ? `${rec.min}` : `${rec.min}–${rec.max}`
  })

  state = computed<'ok' | 'below' | 'above'>(() => {
    const rec = this.recommended()
    if (!rec) {
      return 'ok'
    }
    if (this.current() < rec.min) {
      return 'below'
    }
    if (this.current() > rec.max) {
      return 'above'
    }
    return 'ok'
  })

  icon = computed<string>(() => {
    switch (this.state()) {
      case 'below':
        return 'bi-arrow-up'
      case 'above':
        return 'bi-arrow-down'
      default:
        return 'bi-check-lg'
    }
  })
}
