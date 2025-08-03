import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core'

@Directive({
  selector: '[appAutoFocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private host = inject(ElementRef)

  ngAfterViewInit() {
    this.host.nativeElement.focus()
    this.host.nativeElement.select()
  }
}
