import { DOCUMENT } from '@angular/common'
import { AfterViewInit, Directive, ElementRef, Inject } from '@angular/core'

@Directive({
  selector: '[adSense]',
  standalone: true,
})
export class AdDirective implements AfterViewInit {
  constructor(
    private readonly el: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  ngAfterViewInit() {
    const hostElement = this.el.nativeElement

    if (hostElement) {
      this.replaceDivWithScript(hostElement)
    }
  }

  private replaceDivWithScript(hostElement: HTMLElement) {
    const script = this.document.createElement('script')
    script.type = 'text/javascript'
    script.id = 'your-random-script-id' // Use a unique ID to avoid conflicts.
    script.text = `(adsbygoogle = window.adsbygoogle || []).push({});`

    const parent = hostElement.parentNode
    if (parent) {
      parent.replaceChild(script, hostElement)
    }
  }
}
