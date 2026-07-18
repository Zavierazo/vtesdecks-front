import { ElementRef, Injectable, signal } from '@angular/core'
import { TutorialTargetId } from '../state/tutorial-script.model'

/** Maps script target ids to the DOM elements currently rendering them. */
@Injectable()
export class TutorialTargetRegistryService {
  private readonly targets = new Map<TutorialTargetId, ElementRef<HTMLElement>>()

  /** Bumped on every (un)registration so consumers can re-measure. */
  private readonly version = signal(0)
  readonly version$ = this.version.asReadonly()

  register(target: TutorialTargetId, element: ElementRef<HTMLElement>): void {
    this.targets.set(target, element)
    this.version.update((version) => version + 1)
  }

  unregister(target: TutorialTargetId, element: ElementRef<HTMLElement>): void {
    if (this.targets.get(target) === element) {
      this.targets.delete(target)
      this.version.update((version) => version + 1)
    }
  }

  getElement(target: TutorialTargetId): HTMLElement | undefined {
    return this.targets.get(target)?.nativeElement
  }
}
