import { DOCUMENT } from '@angular/common'
import {
  Directive,
  ElementRef,
  OnDestroy,
  afterEveryRender,
  inject,
} from '@angular/core'

/**
 * Publishes the host's height as `--page-header-height` on the document root.
 *
 * List pages pin their controls in a sticky header whose height changes with
 * its content (the active filter chips wrap to more rows as filters are
 * added), so the scroll offset and the sticky sidebar cannot use a constant.
 */
@Directive({
  selector: '[appStickyHeader]',
})
export class StickyHeaderDirective implements OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly document = inject<Document>(DOCUMENT)

  private height = 0
  private observer?: ResizeObserver

  constructor() {
    // Content changes land with a render pass; a viewport resize may not.
    afterEveryRender(() => this.publishHeight())
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.publishHeight())
      this.observer.observe(this.element.nativeElement)
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect()
    this.document.documentElement.style.removeProperty('--page-header-height')
  }

  private publishHeight() {
    const height = Math.round(
      this.element.nativeElement.getBoundingClientRect().height,
    )
    if (height === this.height || height === 0) {
      return
    }
    this.height = height
    this.document.documentElement.style.setProperty(
      '--page-header-height',
      `${height}px`,
    )
  }
}
