import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { TutorialStore } from '../state/tutorial.store'
import { TutorialTargetId } from '../state/tutorial-script.model'
import { TutorialTargetRegistryService } from './tutorial-target-registry.service'

/**
 * Marks an element as a script target: registers it for the spotlight,
 * forwards clicks to the store, and reflects highlight/actionable state.
 */
@Directive({
  selector: '[appTutorialTarget]',
  host: {
    '[class.tutorial-target]': 'true',
    '[class.tutorial-target-highlighted]': 'highlighted$()',
    '[class.tutorial-target-actionable]': 'actionable$()',
    '[class.tutorial-target-lifted]': 'lifted$()',
    '(click)': 'onClick($event)',
  },
})
export class TutorialTargetDirective implements OnInit, OnDestroy {
  private readonly store = inject(TutorialStore)
  private readonly registry = inject(TutorialTargetRegistryService)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly appTutorialTarget = input.required<TutorialTargetId>()

  readonly highlighted$ = computed(() =>
    this.store.highlight$().has(this.appTutorialTarget()),
  )

  readonly actionable$ = computed(() => {
    // Recompute on step change: canInteract reads the current step signal.
    this.store.currentStep$()
    return this.store.canInteract(this.appTutorialTarget())
  })

  readonly lifted$ = computed(
    () => `card:${this.store.pendingDragRef$()}` === this.appTutorialTarget(),
  )

  ngOnInit(): void {
    this.registry.register(this.appTutorialTarget(), this.elementRef)
  }

  ngOnDestroy(): void {
    this.registry.unregister(this.appTutorialTarget(), this.elementRef)
  }

  onClick(event: Event): void {
    if (this.actionable$()) {
      event.stopPropagation()
      this.store.clickTarget(this.appTutorialTarget())
    }
  }
}
