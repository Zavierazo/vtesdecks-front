import {
  Directive,
  ElementRef,
  inject,
  OnInit,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core'

@Directive({
  selector: '[appLazyRender]',
})
export class LazyRenderDirective implements OnInit {
  private element = inject(ElementRef<HTMLElement>)
  private templateRef = inject(TemplateRef<unknown>)
  private viewContainer = inject(ViewContainerRef)

  ngOnInit() {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.viewContainer.createEmbeddedView(this.templateRef)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )

    observer.observe(this.element.nativeElement.parentElement)
  }
}
