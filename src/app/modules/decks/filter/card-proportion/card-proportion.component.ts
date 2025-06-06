import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  output,
} from '@angular/core'
import {
  ControlContainer,
  FormControl,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { debounceTime, tap } from 'rxjs'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgClass } from '@angular/common'

@UntilDestroy()
@Component({
  selector: 'app-card-proportion',
  templateUrl: './card-proportion.component.html',
  styleUrls: ['./card-proportion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    { provide: ControlContainer, useExisting: FormGroupDirective },
  ],
  imports: [TranslocoDirective, NgClass, ReactiveFormsModule],
})
export class CardProportionComponent implements OnInit, OnChanges {
  private static readonly ABSOLUTE_MAX = 90
  private static readonly PERCENTAGE_MAX = 100

  @Input() controlName!: string

  @Input() absolute!: boolean

  @Input() custom!: boolean

  @Input() value!: string

  readonly valueChanges = output<string>()

  min = new FormControl<number>(0)
  max = new FormControl<number>(0)

  constructor() {}

  ngOnInit() {
    this.patchCustomValue()
    this.listenCustomValue()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['absolute'] || changes['custom']) {
      this.patchCustomValue()
    }
  }

  private patchCustomValue() {
    const min = 0
    const max = this.absolute
      ? CardProportionComponent.ABSOLUTE_MAX
      : CardProportionComponent.PERCENTAGE_MAX
    if (this.value && this.value !== 'any') {
      const values = this.value?.split(',')
      this.min.patchValue(Number(values[0]), { emitEvent: false })
      this.max.patchValue(Number(values[1]), { emitEvent: false })
    } else {
      this.min.patchValue(min, { emitEvent: false })
      this.max.patchValue(max, { emitEvent: false })
    }
  }

  private listenCustomValue() {
    this.handleValueChanges(this.min)
    this.handleValueChanges(this.max)
  }

  private handleValueChanges(control: FormControl<number | null>) {
    control.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap((value) => {
          if (value !== null) {
            if (value < 0) {
              control.patchValue(0)
            } else if (
              this.absolute &&
              value > CardProportionComponent.ABSOLUTE_MAX
            ) {
              control.patchValue(CardProportionComponent.ABSOLUTE_MAX)
            } else if (
              !this.absolute &&
              value > CardProportionComponent.PERCENTAGE_MAX
            ) {
              control.patchValue(CardProportionComponent.PERCENTAGE_MAX)
            } else {
              const min = this.min.value
              const max = this.max.value
              if (
                min === 0 &&
                ((this.absolute &&
                  max === CardProportionComponent.ABSOLUTE_MAX) ||
                  (!this.absolute &&
                    max === CardProportionComponent.PERCENTAGE_MAX))
              ) {
                this.valueChanges.emit('any')
              } else {
                this.valueChanges.emit(`${this.min.value},${this.max.value}`)
              }
            }
          }
        }),
      )
      .subscribe()
  }
}
