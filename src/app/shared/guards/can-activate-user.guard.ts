import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AuthQuery } from '../../state/auth/auth.query'

@Injectable({
  providedIn: 'root',
})
export class CanActivateUser {
  constructor(
    private readonly authQuery: AuthQuery,
    private readonly router: Router,
  ) {}

  canActivate(): boolean {
    if (this.authQuery.isAuthenticated()) {
      return true
    } else {
      this.router.navigate(['/'])
      return false
    }
  }
}
