import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap'

export interface SortOption {
  value: string
  labelKey: string
  titleKey?: string
}

@Component({
  selector: 'app-sort-control',
  templateUrl: './sort-control.component.html',
  styleUrls: ['./sort-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
  ],
})
export class SortControlComponent {
  readonly options = input.required<SortOption[]>()
  readonly active = input.required<string>()
  readonly order = input.required<'asc' | 'desc'>()
  readonly disabled = input(false)

  readonly sortChange = output<string>()

  readonly activeOption = computed(
    () =>
      this.options().find((option) => option.value === this.active()) ??
      this.options()[0],
  )

  readonly activeLabelKey = computed(() => this.activeOption()?.labelKey ?? '')

  readonly orderLabelKey = computed(() =>
    this.order() === 'asc' ? 'shared.ascending' : 'shared.descending',
  )

  onSelect(option: SortOption, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    this.sortChange.emit(option.value)
  }
}
