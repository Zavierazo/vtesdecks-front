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
 * forwards clicks to the store, reflects highlight/actionable state, and
 * lets the drag-step source card be physically dragged onto its destination
 * (tap-tap on the card and the destination still works as a fallback).
 */
@Directive({
  selector: '[appTutorialTarget]',
  host: {
    '[class.tutorial-target]': 'true',
    '[class.tutorial-target-highlighted]': 'highlighted$()',
    '[class.tutorial-target-actionable]': 'actionable$()',
    '[class.tutorial-target-lifted]': 'lifted$()',
    '[class.tutorial-target-draggable]': 'dragSource$()',
    '(click)': 'onClick($event)',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class TutorialTargetDirective implements OnInit, OnDestroy {
  /** Pointer must travel this far (px) before a press becomes a drag. */
  private static readonly dragThresholdPx = 6
  /** Extra tolerance (px) around the destination when dropping. */
  private static readonly dropPaddingPx = 12

  private readonly store = inject(TutorialStore)
  private readonly registry = inject(TutorialTargetRegistryService)
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly appTutorialTarget = input.required<TutorialTargetId>()

  private dragStart?: { x: number; y: number }
  private dragging = false
  private suppressClick = false
  /** Fixed-position clone attached to <body>: escapes every stacking context. */
  private dragGhost?: HTMLElement

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

  readonly dragSource$ = computed(() => {
    const advance = this.store.currentStep$().advance
    return (
      advance.type === 'drag' &&
      `card:${advance.ref}` === this.appTutorialTarget()
    )
  })

  ngOnInit(): void {
    this.registry.register(this.appTutorialTarget(), this.elementRef)
  }

  ngOnDestroy(): void {
    this.stopDragListeners()
    this.registry.unregister(this.appTutorialTarget(), this.elementRef)
  }

  onClick(event: Event): void {
    if (this.suppressClick) {
      this.suppressClick = false
      event.stopPropagation()
      return
    }
    if (this.actionable$()) {
      event.stopPropagation()
      this.store.clickTarget(this.appTutorialTarget())
    }
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.dragSource$() || !event.isPrimary) {
      return
    }
    this.dragStart = { x: event.clientX, y: event.clientY }
    this.dragging = false
    window.addEventListener('pointermove', this.onDragMove)
    window.addEventListener('pointerup', this.onDragEnd)
    window.addEventListener('pointercancel', this.onDragCancel)
  }

  private readonly onDragMove = (event: PointerEvent): void => {
    if (!this.dragStart) {
      return
    }
    const dx = event.clientX - this.dragStart.x
    const dy = event.clientY - this.dragStart.y
    if (
      !this.dragging &&
      Math.hypot(dx, dy) < TutorialTargetDirective.dragThresholdPx
    ) {
      return
    }
    if (!this.dragging) {
      this.dragging = true
      this.createGhost()
    }
    event.preventDefault()
    if (this.dragGhost) {
      this.dragGhost.style.transform = `translate(${dx}px, ${dy}px)`
    }
  }

  /**
   * The card itself sits inside the board's stacking contexts, so moving it
   * with a transform would slide it behind neighbouring zones. Drag a
   * fixed-position clone parented to <body> instead and dim the original.
   */
  private createGhost(): void {
    const element = this.elementRef.nativeElement
    const rect = element.getBoundingClientRect()
    const ghost = element.cloneNode(true) as HTMLElement
    ghost.classList.add('tutorial-drag-ghost')
    ghost.style.position = 'fixed'
    ghost.style.left = `${rect.left}px`
    ghost.style.top = `${rect.top}px`
    ghost.style.width = `${rect.width}px`
    ghost.style.margin = '0'
    document.body.appendChild(ghost)
    this.dragGhost = ghost
    element.classList.add('tutorial-target-dragging')
  }

  private readonly onDragEnd = (event: PointerEvent): void => {
    const wasDragging = this.dragging
    this.resetDragVisuals()
    this.stopDragListeners()
    if (!wasDragging) {
      return
    }
    // The click that follows pointerup must not re-select the card.
    this.suppressClick = true
    const advance = this.store.currentStep$().advance
    if (advance.type !== 'drag') {
      return
    }
    const destination = this.registry.getElement(advance.to)
    if (!destination) {
      return
    }
    const rect = destination.getBoundingClientRect()
    const pad = TutorialTargetDirective.dropPaddingPx
    if (
      event.clientX >= rect.left - pad &&
      event.clientX <= rect.right + pad &&
      event.clientY >= rect.top - pad &&
      event.clientY <= rect.bottom + pad
    ) {
      this.store.dropCard(advance.ref, advance.to)
    }
  }

  private readonly onDragCancel = (): void => {
    this.resetDragVisuals()
    this.stopDragListeners()
  }

  private resetDragVisuals(): void {
    this.dragGhost?.remove()
    this.dragGhost = undefined
    this.elementRef.nativeElement.classList.remove('tutorial-target-dragging')
    this.dragStart = undefined
    this.dragging = false
  }

  private stopDragListeners(): void {
    window.removeEventListener('pointermove', this.onDragMove)
    window.removeEventListener('pointerup', this.onDragEnd)
    window.removeEventListener('pointercancel', this.onDragCancel)
  }
}
