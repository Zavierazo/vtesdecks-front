import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { LoginComponent } from '@shared/components/login/login.component'
import { AuthQuery } from '@state/auth/auth.query'

@Injectable({
  providedIn: 'root',
})
export class CanActivateUser {
  private readonly authQuery = inject(AuthQuery)
  private readonly router = inject(Router)
  private readonly modalService = inject(NgbModal)

  canActivate(): boolean {
    if (this.authQuery.isAuthenticated()) {
      return true
    } else {
      this.modalService.open(LoginComponent)
      return false
    }
  }
}
