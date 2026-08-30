import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { Observable } from 'rxjs'

/**
 * One removable filter chip. `key` identifies the filter (a card filter field
 * name, or a deck query param name) and `item` the individual value inside a
 * multi-value filter, so the host knows exactly what to drop.
 */
export interface FilterChip {
  id: string
  label: string
  key: string
  item?: string
  value?: string
  value$?: Observable<string>
}

@Component({
  selector: 'app-filter-chips',
  templateUrl: './filter-chips.component.html',
  styleUrls: ['./filter-chips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, TranslocoPipe],
})
export class FilterChipsComponent {
  readonly chips = input.required<FilterChip[]>()

  readonly remove = output<FilterChip>()
  readonly clearAll = output<void>()
}
