import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { AdSenseDirective } from '../../directives/ad-sense.directive'
import { IsSupporterDirective } from '../../directives/is-supporter.directive'

@Component({
  selector: 'app-ad-sense',
  templateUrl: './ad-sense.component.html',
  styleUrls: ['./ad-sense.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdSenseDirective, IsSupporterDirective, TranslocoPipe],
})
export class AdSenseComponent {
  @Input() adClient!: string
  @Input() adSlot!: string
  @Input() adFormat!: string
  @Input() fullWidthResponsive!: string
}
