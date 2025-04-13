import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy'
import {
  ChangeDetectorRef,
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core'
import { tap } from 'rxjs'
import { AuthQuery } from '../../state/auth/auth.query'

@UntilDestroy()
@Directive({
  selector: '[isLogged]',
})
export class IsLoggedDirective {
  private hasView = false

  constructor(
    private authQuery: AuthQuery,
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private changes: ChangeDetectorRef,
  ) {}

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
