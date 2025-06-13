import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable, tap } from 'rxjs'
import { ApiUserNotification } from '../../../models/api-user-notification'
import { ApiDataService } from '../../../services/api.data.service'
import { AuthService } from '../../../state/auth/auth.service'
import { DateAsAgoPipe } from '../../pipes/date-ago.pipe'

@UntilDestroy()
@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, NgClass, RouterLink, AsyncPipe, DateAsAgoPipe],
})
export class NotificationListComponent implements OnInit {
  offcanvas = inject(NgbActiveOffcanvas)
  private readonly apiDataService = inject(ApiDataService)
  private readonly authService = inject(AuthService)

  notifications$!: Observable<ApiUserNotification[]>

  ngOnInit() {
    this.notifications$ = this.apiDataService.getNotifications()
  }

  read(id: number) {
    this.apiDataService
      .readNotification(id)
      .pipe(
        untilDestroyed(this),
        tap(() => {
          this.authService.readNotification()
          this.offcanvas.close()
        }),
      )
      .subscribe()
  }

  readAll() {
    this.apiDataService
      .readAllNotification()
      .pipe(
        untilDestroyed(this),
        tap(() => {
          this.authService.readNotification(true)
          this.offcanvas.close()
        }),
      )
      .subscribe()
  }
}
