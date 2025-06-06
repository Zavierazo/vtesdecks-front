import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { AuthQuery } from '../../state/auth/auth.query'

@Injectable({
  providedIn: 'root',
})
export class CanActivateUser {
  private readonly authQuery = inject(AuthQuery)
  private readonly router = inject(Router)

  canActivate(): boolean {
    if (this.authQuery.isAuthenticated()) {
      return true
    } else {
      this.router.navigate(['/'])
      return false
    }
  }
}
