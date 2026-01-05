import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
} from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService, UserFollowService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { filter, Observable, switchMap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-user-follow-button',
  templateUrl: './user-follow-button.component.html',
  styleUrls: ['./user-follow-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, NgClass, TranslocoDirective, NgbTooltip],
})
export class UserFollowButtonComponent implements OnInit {
  private readonly userFollowService = inject(UserFollowService)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly authQuery = inject(AuthQuery)

  username = input<string>()

  isFollowing$!: Observable<boolean>
  isAuthenticated$ = this.authQuery.selectAuthenticated()
  currentUser$ = this.authQuery.selectUser()

  ngOnInit(): void {
    const user = this.username()
    if (user) {
      this.isFollowing$ = this.userFollowService.isFollowing(user)
      this.authQuery
        .selectAuthenticated()
        .pipe(
          untilDestroyed(this),
          filter((isAuth) => isAuth),
          switchMap(() => this.userFollowService.loadFollowingUser(user)),
        )
        .subscribe()
    }
  }

  toggleFollow(): void {
    const user = this.username()
    if (!user) {
      return
    }

    const newFollowStatus = !this.userFollowService.getFollowing(user)
    this.userFollowService
      .toggleFollow(user, newFollowStatus)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (success) => {
          if (!success) {
            this.toastService.show(
              this.translocoService.translate('follow.follow_error'),
              { classname: 'bg-danger text-light', delay: 5000 },
            )
          }
        },
        error: () => {
          this.toastService.show(
            this.translocoService.translate('follow.follow_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
        },
      })
  }
}
