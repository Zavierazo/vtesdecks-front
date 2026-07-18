import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core'
import { TutorialStore } from '../state/tutorial.store'
import { TutorialTargetRegistryService } from './tutorial-target-registry.service'

interface SpotlightHole {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Dim overlay with a rounded "hole" over the highlighted element. Only shown
 * for single-target highlights; multi-target steps rely on the per-element
 * outline from TutorialTargetDirective.
 */
@Component({
  selector: 'app-tutorial-spotlight',
  templateUrl: './tutorial-spotlight.component.html',
  styleUrls: ['./tutorial-spotlight.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorialSpotlightComponent {
  private readonly store = inject(TutorialStore)
  private readonly registry = inject(TutorialTargetRegistryService)
  private readonly destroyRef = inject(DestroyRef)

  readonly hole$ = signal<SpotlightHole | undefined>(undefined)

  constructor() {
    const onResize = () => this.measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    // Late image loads (card scans) shift the layout after the initial
    // measure — track any body size change, not just window resizes.
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(document.body)
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      resizeObserver.disconnect()
    })
    effect(() => {
      // Re-measure when the highlighted targets or rendered elements change.
      this.store.highlight$()
      this.registry.version$()
      // Wait a frame so zone/card moves have settled in the DOM. The timeout
      // fallback covers environments where rAF is throttled or suspended.
      requestAnimationFrame(() => this.measure())
      setTimeout(() => this.measure(), 120)
    })
  }

  private measure(): void {
    const highlight = [...this.store.highlight$()]
    if (highlight.length !== 1) {
      this.hole$.set(undefined)
      return
    }
    const element = this.registry.getElement(highlight[0])
    if (!element) {
      this.hole$.set(undefined)
      return
    }
    const rect = element.getBoundingClientRect()
    const padding = 6
    this.hole$.set({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  }
}
