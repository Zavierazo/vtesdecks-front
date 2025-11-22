import {
  ChangeDetectorRef,
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { AuthQuery } from '@state/auth/auth.query'
import { tap } from 'rxjs'

@UntilDestroy()
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[isLogged]' })
export class IsLoggedDirective {
  private readonly authQuery = inject(AuthQuery)
  private readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef)
  private readonly viewContainer = inject(ViewContainerRef)
  private readonly changes = inject(ChangeDetectorRef)

  private hasView = false

  @Input() set isLogged(logged: boolean) {
    this.authQuery
      .selectAuthenticated()
      .pipe(
        untilDestroyed(this),
        tap((authenticated) => {
          const condition = logged ? authenticated : !authenticated
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
