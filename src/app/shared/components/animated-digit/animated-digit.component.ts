import {
  Component,
  ElementRef,
  Input,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  viewChild,
} from '@angular/core'

@Component({
  selector: 'animated-digit',
  templateUrl: 'animated-digit.component.html',
  styleUrls: ['animated-digit.component.scss'],
})
export class AnimatedDigitComponent implements AfterViewInit, OnChanges {
  @Input() duration!: number
  @Input() digit!: number
  @Input() steps!: number
  readonly animatedDigit = viewChild.required<ElementRef>('animatedDigit')

  animateCount() {
    if (!this.duration) {
      this.duration = 1000
    }

    if (typeof this.digit === 'number') {
      this.counterFunc(this.digit + 1, this.duration, this.animatedDigit())
    }
  }

  counterFunc(endValue: number, durationMs: number, element: ElementRef) {
    if (!this.steps) {
      this.steps = 12
    }

    const stepCount = Math.abs(durationMs / this.steps)
    const valueIncrement = (endValue - 0) / stepCount
    const sinValueIncrement = Math.PI / stepCount

    let currentValue = 0
    let currentSinValue = 0

    function step() {
      currentSinValue += sinValueIncrement
      currentValue += valueIncrement * Math.sin(currentSinValue) ** 2 * 2

      if (element && element.nativeElement) {
        element.nativeElement.textContent = Math.abs(Math.floor(currentValue))
      }

      if (currentSinValue < Math.PI) {
        window.requestAnimationFrame(step)
      }
    }

    step()
  }

  ngAfterViewInit() {
    if (this.digit) {
      this.animateCount()
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['digit']) {
      this.animateCount()
    }
  }
}
