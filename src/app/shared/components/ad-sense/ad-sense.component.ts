import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { AdSenseDirective } from '../../directives/ad-sense.directive'

@Component({
  selector: 'app-ad-sense',
  templateUrl: './ad-sense.component.html',
  styleUrls: ['./ad-sense.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdSenseDirective],
})
export class AdSenseComponent {
  @Input() adClient!: string
  @Input() adSlot!: string
  @Input() adFormat!: string
  @Input() fullWidthResponsive!: string
}
