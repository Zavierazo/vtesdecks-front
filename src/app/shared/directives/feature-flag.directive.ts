import {
  ChangeDetectorRef,
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { FeatureFlagQuery } from '@state/feature-flag/feature-flag.query'
import { Subscription, tap } from 'rxjs'

@UntilDestroy()
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[featureFlag]' })
export class FeatureFlagDirective {
  private readonly featureFlagQuery = inject(FeatureFlagQuery)
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef)
  private readonly viewContainer = inject(ViewContainerRef)
  private readonly changes = inject(ChangeDetectorRef)

  private hasView = false
  private subscription?: Subscription

  @Input() set featureFlag(key: string) {
    this.subscription?.unsubscribe()
    this.subscription = this.featureFlagQuery
      .selectEnabled(key)
      .pipe(
        untilDestroyed(this),
        tap((enabled) => {
          if (enabled && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef)
            this.hasView = true
            this.changes.markForCheck()
          } else if (!enabled && this.hasView) {
            this.viewContainer.clear()
            this.hasView = false
            this.changes.markForCheck()
          }
        }),
      )
      .subscribe()
  }
}
