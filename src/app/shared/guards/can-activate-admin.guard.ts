import { Injectable, inject } from '@angular/core'
import { Router, UrlTree } from '@angular/router'
import { AuthQuery } from '@state/auth/auth.query'

@Injectable({
  providedIn: 'root',
})
export class CanActivateAdmin {
  private readonly authQuery = inject(AuthQuery)
  private readonly router = inject(Router)

  canActivate(): boolean | UrlTree {
    if (this.authQuery.isAdmin()) {
      return true
    }
    return this.router.parseUrl('/')
  }
}
