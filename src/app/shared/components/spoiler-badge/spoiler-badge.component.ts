import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { SpoilerVisitService } from '@services'

@Component({
  selector: 'app-spoiler-badge',
  template: `
    <span
      class="spoiler-badge d-inline-flex align-items-center rounded-pill fw-semibold"
      [class.spoiler-badge-compact]="compact()"
      [class.spoiler-badge-stacked]="stacked()"
      [class.spoiler-badge-new]="isNew()"
      [attr.aria-label]="
        (isNew()
          ? 'deck_shared.spoiler_new_accessible'
          : 'deck_shared.spoiler_accessible'
        ) | transloco
      "
      [attr.title]="
        (isNew()
          ? 'deck_shared.spoiler_new_accessible'
          : 'deck_shared.spoiler_accessible'
        ) | transloco
      "
    >
      @if (stacked()) {
        <span class="spoiler-badge-label-stacked" aria-hidden="true">
          @for (letter of stackedLabel; track $index) {
            <span>{{ letter }}</span>
          }
        </span>
      } @else {
        <span>{{ 'deck_shared.spoiler' | transloco }}</span>
      }
    </span>
  `,
  styles: `
    .spoiler-badge {
      position: relative;
      padding: 0.2rem 0.55rem;
      background: #6f42c1;
      color: #fff;
      font-size: 0.75rem;
      line-height: 1.2;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .spoiler-badge-compact {
      padding: 0.15rem 0.45rem;
      font-size: 0.7rem;
    }

    .spoiler-badge-stacked {
      flex-direction: column;
      padding: 0.4rem 0.25rem;
      font-size: 0.65rem;
      line-height: 1;
      text-align: center;
      text-transform: uppercase;
    }

    .spoiler-badge-label-stacked {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .spoiler-badge-label-stacked > span {
      display: block;
      width: 1em;
      text-align: center;
    }

    .spoiler-badge-new {
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.2),
        0 0 0 1.5px #f6d365;
    }

    .spoiler-badge-new::after {
      position: absolute;
      top: -0.15rem;
      right: -0.15rem;
      width: 0.45rem;
      height: 0.45rem;
      background: #f6d365;
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(58, 33, 95, 0.6);
      content: '';
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
})
export class SpoilerBadgeComponent {
  private readonly spoilerVisitService = inject(SpoilerVisitService)
  readonly stackedLabel = [...'SPOILER']
  compact = input(false)
  stacked = input(false)
  lastUpdate = input<Date | string | null>()
  isNew = computed(() => this.spoilerVisitService.isNewCard(this.lastUpdate()))
}
