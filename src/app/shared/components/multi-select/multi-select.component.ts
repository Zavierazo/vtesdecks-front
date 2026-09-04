import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core'
import {
  NgbDropdown,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap'

export interface MultiSelectOption {
  value: string
  label: string
  shortLabel?: string
}

export type MultiSelectState = 'unchecked' | 'checked' | 'excluded'

export interface MultiSelectSelection {
  selected: string[]
  excluded: string[]
}

/**
 * Select-like multi-select. With `allowExclude`, repeated activation cycles an
 * option through unchecked, checked, and excluded states.
 */
@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu],
})
export class MultiSelectComponent {
  readonly options = input.required<readonly MultiSelectOption[]>()
  readonly selected = input<readonly string[]>([])
  readonly excluded = input<readonly string[]>([])
  readonly allowExclude = input(false)
  readonly exclusiveValues = input<readonly string[]>([])
  readonly controlId = input.required<string>()
  readonly label = input.required<string>()
  readonly placeholder = input('')
  readonly selectionChange = output<MultiSelectSelection>()

  readonly summary = computed(() => {
    const selected = this.options()
      .filter((option) => this.selected().includes(option.value))
      .map((option) => option.shortLabel ?? option.label)
    const excluded = this.allowExclude()
      ? this.options()
          .filter((option) => this.excluded().includes(option.value))
          .map((option) => `!${option.shortLabel ?? option.label}`)
      : []
    return [...selected, ...excluded].join(', ')
  })
  readonly ariaLabel = computed(() => {
    const value = this.summary() || this.placeholder()
    return value ? `${this.label()}: ${value}` : this.label()
  })

  state(value: string): MultiSelectState {
    if (this.allowExclude() && this.excluded().includes(value)) {
      return 'excluded'
    }
    if (this.selected().includes(value)) return 'checked'
    return 'unchecked'
  }

  toggle(value: string): void {
    let selected = this.selected().filter((item) => item !== value)
    const excluded = this.allowExclude()
      ? this.excluded().filter((item) => item !== value)
      : []
    const state = this.state(value)

    if (state === 'unchecked') {
      selected = this.exclusiveValues().includes(value)
        ? []
        : selected.filter((item) => !this.exclusiveValues().includes(item))
      selected.push(value)
    } else if (state === 'checked' && this.allowExclude()) {
      excluded.push(value)
    }

    this.selectionChange.emit({ selected, excluded })
  }

  ariaState(value: string): 'true' | 'false' | 'mixed' {
    const state = this.state(value)
    if (state === 'excluded') return 'mixed'
    return state === 'checked' ? 'true' : 'false'
  }
}
