import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { NgbActiveOffcanvas, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '../../../services/api.data.service'
import { Observable, of, tap } from 'rxjs'
import { ApiUserNotification } from '../../../models/api-user-notification'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { AuthService } from '../../../state/auth/auth.service'
import { TranslocoDirective } from '@jsverse/transloco';
import { NgClass, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DateAsAgoPipe } from '../../pipes/date-ago.pipe';

@UntilDestroy()
@Component({
    selector: 'app-notification-list',
    templateUrl: './notification-list.component.html',
    styleUrls: ['./notification-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, NgClass, RouterLink, AsyncPipe, DateAsAgoPipe]
})
export class NotificationListComponent implements OnInit {
  notifications$!: Observable<ApiUserNotification[]>

  constructor(
    public offcanvas: NgbActiveOffcanvas,
    private apiDataService: ApiDataService,
    private authService: AuthService,
  ) {}

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
