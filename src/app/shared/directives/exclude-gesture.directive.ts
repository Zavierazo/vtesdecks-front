import {
  Directive,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  inject,
  output,
} from '@angular/core'

const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10

/**
 * Emits `excludeGesture` on right-click (desktop) or long-press (touch).
 * The click that some browsers fire after a long-press is swallowed so the
 * host's regular (click) handler doesn't also run.
 */
@Directive({
  selector: '[appExcludeGesture]',
})
export class ExcludeGestureDirective implements OnDestroy {
  private host = inject(ElementRef)
  private ngZone = inject(NgZone)

  readonly excludeGesture = output<void>()

  private pressTimer?: ReturnType<typeof setTimeout>
  private longPressFired = false
  private startX = 0
  private startY = 0
  private readonly suppressClick = (event: Event) => {
    if (this.longPressFired) {
      event.preventDefault()
      event.stopPropagation()
      this.longPressFired = false
    }
  }

  constructor() {
    // Capture phase so a click following a long-press is swallowed before the
    // host's own (click) handler runs.
    this.host.nativeElement.addEventListener('click', this.suppressClick, {
      capture: true,
    })
  }

  ngOnDestroy() {
    this.clearTimer()
    this.host.nativeElement.removeEventListener('click', this.suppressClick, {
      capture: true,
    })
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: Event) {
    event.preventDefault()
    // Android fires contextmenu on long-press too; the pointer timer already
    // handled that case.
    if (!this.longPressFired) {
      this.excludeGesture.emit()
    }
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return
    }
    this.startX = event.clientX
    this.startY = event.clientY
    this.longPressFired = false
    this.clearTimer()
    this.ngZone.runOutsideAngular(() => {
      this.pressTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.longPressFired = true
          this.excludeGesture.emit()
        })
      }, LONG_PRESS_MS)
    })
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (
      this.pressTimer &&
      (Math.abs(event.clientX - this.startX) > MOVE_TOLERANCE_PX ||
        Math.abs(event.clientY - this.startY) > MOVE_TOLERANCE_PX)
    ) {
      this.clearTimer()
    }
  }

  @HostListener('pointerup')
  @HostListener('pointercancel')
  @HostListener('pointerleave')
  onPointerEnd() {
    this.clearTimer()
  }

  private clearTimer() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer)
      this.pressTimer = undefined
    }
  }
}
