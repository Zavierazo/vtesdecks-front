import { DOCUMENT } from '@angular/common'
import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core'

let uniqueId = 0

@Directive({
  selector: '[adSense]',
  standalone: true,
})
export class AdSenseDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject<Document>(DOCUMENT);


  ngAfterViewInit() {
    const hostElement = this.el.nativeElement

    if (hostElement) {
      this.replaceDivWithScript(hostElement)
    }
  }

  private replaceDivWithScript(hostElement: HTMLElement) {
    const script = this.document.createElement('script')
    script.type = 'text/javascript'
    script.id = `adsbygoogle-push-script-${uniqueId++}`
    script.text = `(adsbygoogle = window.adsbygoogle || []).push({});`

    const parent = hostElement.parentNode
    if (parent) {
      parent.replaceChild(script, hostElement)
    }
  }
}
