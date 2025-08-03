import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { ApiCard } from './../../../models/api-card'

@Component({
  selector: 'app-collection-card-tracker',
  templateUrl: './collection-card-tracker.component.html',
  styleUrls: ['./collection-card-tracker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionCardTrackerComponent {
  card = input.required<ApiCard>()
}
