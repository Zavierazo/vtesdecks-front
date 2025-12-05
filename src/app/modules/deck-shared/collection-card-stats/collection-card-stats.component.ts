import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCollectionCardStats } from '@models'
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@UntilDestroy()
@Component({
  selector: 'app-collection-card-stats',
  templateUrl: './collection-card-stats.component.html',
  styleUrls: ['./collection-card-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    RouterLink,
    NgbTooltip,
    NgbCollapse,
    SetTooltipComponent,
    NgClass,
  ],
})
export class CollectionCardStatsComponent {
  collectionStats = input.required<ApiCollectionCardStats>()
  routerClick = output<boolean>()

  decksCollapsed = true
  collectionCollapsed = true
}
