import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'

@Component({
  selector: 'app-card-quantity',
  imports: [TranslocoPipe],
  templateUrl: './card-quantity.component.html',
  styleUrl: './card-quantity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': '$event.stopPropagation()',
    '(mouseup)': '$event.stopPropagation()',
    '(dblclick)': '$event.stopPropagation()',
    '(keydown)': '$event.stopPropagation()',
  },
})
export class CardQuantityComponent {
  readonly quantity = input.required<number>()
  readonly name = input.required<string>()
  readonly prefix = input('')
  readonly editing = signal(false)

  @ViewChild('field')
  set field(element: ElementRef<HTMLInputElement> | undefined) {
    if (element) {
      element.nativeElement.focus()
      element.nativeElement.select()
    }
  }
  readonly quantityChanged = output<number>()

  commit(field: HTMLInputElement): void {
    if (!this.editing()) {
      return
    }
    this.editing.set(false)
    const value = field.value.trim()
    const quantity = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(quantity)) {
      field.value = String(this.quantity())
      return
    }
    field.value = String(quantity)
    if (quantity !== this.quantity()) {
      this.quantityChanged.emit(quantity)
    }
  }

  onKeydown(event: KeyboardEvent, field: HTMLInputElement): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.commit(field)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      field.value = String(this.quantity())
      this.editing.set(false)
    }
  }
}
