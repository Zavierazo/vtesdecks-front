import {
  ChangeDetectorRef,
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { tap } from 'rxjs'
import { AuthQuery } from '../../state/auth/auth.query'

@UntilDestroy()
@Directive({ selector: '[appIsSupporter]' })
export class IsSupporterDirective {
  private readonly authQuery = inject(AuthQuery)
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef)
  private readonly viewContainer = inject(ViewContainerRef)
  private readonly changes = inject(ChangeDetectorRef)

  private hasView = false

  @Input() set appIsSupporter(supporting: boolean) {
    this.authQuery
      .selectSupporter()
      .pipe(
        untilDestroyed(this),
        tap((supporter) => {
          const condition = supporting ? supporter : !supporter
          if (condition && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef)
            this.hasView = true
            this.changes.markForCheck()
          } else if (!condition && this.hasView) {
            this.viewContainer.clear()
            this.hasView = false
            this.changes.markForCheck()
          }
        }),
      )
      .subscribe()
  }
}
