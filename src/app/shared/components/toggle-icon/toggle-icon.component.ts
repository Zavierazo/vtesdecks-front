import { NgClass } from '@angular/common'
import { Component, EventEmitter, input, Output } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'

export interface ToggleOption {
  option: string
  icon: string
  label: string
}

@Component({
  selector: 'app-toggle-icon',
  templateUrl: './toggle-icon.component.html',
  styleUrls: ['./toggle-icon.component.scss'],
  imports: [NgClass, TranslocoPipe],
})
export class ToggleIconComponent {
  active = input.required<string>()
  options = input.required<ToggleOption[]>()
  @Output() toggleChange = new EventEmitter<string>()

  onToggle(option: ToggleOption) {
    this.toggleChange.emit(option.option)
  }
}
