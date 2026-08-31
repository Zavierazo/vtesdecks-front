import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'

/** One button of a segmented filter. `value` is the filter value it selects. */
export interface SegmentedFilterOption {
  value?: string
  labelKey: string
  titleKey?: string
}

/**
 * Small segmented button group for filters with a handful of exclusive states
 * (any / base / advanced, any / trifle / non-trifle, ...).
 */
@Component({
  selector: 'app-segmented-filter',
  templateUrl: './segmented-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class SegmentedFilterComponent {
  readonly options = input.required<SegmentedFilterOption[]>()
  readonly value = input<string>()
  readonly ariaLabel = input<string>()
  readonly valueChange = output<string | undefined>()

  isActive(option: SegmentedFilterOption): boolean {
    return (this.value() || undefined) === (option.value || undefined)
  }
}
