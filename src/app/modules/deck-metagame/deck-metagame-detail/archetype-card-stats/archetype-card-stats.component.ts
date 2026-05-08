import { DecimalPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiArchetypeKeyCard } from '@models'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-archetype-card-stats',
  templateUrl: './archetype-card-stats.component.html',
  styleUrls: ['./archetype-card-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TranslocoPipe, NgbTooltip],
})
export class ArchetypeCardStatsComponent {
  stats = input.required<ApiArchetypeKeyCard>()
  isSuggestion = input<boolean>(false)
}
