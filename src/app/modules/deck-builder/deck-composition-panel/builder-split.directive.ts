import {
  AfterViewInit,
  computed,
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core'

const STORAGE_KEY = 'deck-builder-split'

@Directive({
  selector: '[appBuilderSplit]',
  exportAs: 'builderSplit',
  host: { '[class.deck-picker-split]': 'visible()' },
})
export class BuilderSplitDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly enabled = signal(this.readPreference())
  private readonly width = signal(0)
  private observer?: ResizeObserver
  readonly available = computed(() => this.width() >= 1280)
  readonly visible = computed(() => this.available() && this.enabled())

  ngAfterViewInit(): void {
    this.observer = new ResizeObserver(([entry]) =>
      this.width.set(entry.contentRect.width),
    )
    this.observer.observe(this.element.nativeElement)
  }

  toggle(): void {
    this.enabled.update((enabled) => !enabled)
    try {
      localStorage.setItem(STORAGE_KEY, String(this.enabled()))
    } catch {
      // Toggling remains available when browser storage is unavailable.
    }
  }

  private readPreference(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false'
    } catch {
      return true
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
  }
}
