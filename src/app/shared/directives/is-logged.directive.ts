import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy'
import { ChangeDetectorRef, Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core'
import { tap } from 'rxjs'
import { AuthQuery } from '../../state/auth/auth.query'

@UntilDestroy()
@Directive({ selector: '[isLogged]' })
export class IsLoggedDirective {
  private authQuery = inject(AuthQuery);
  private templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  private changes = inject(ChangeDetectorRef);

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
