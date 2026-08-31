import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { TranslocoService } from '@jsverse/transloco'
import { ApiUserNotification } from '@models'
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, PushNotificationService } from '@services'
import { AuthService } from '@state/auth/auth.service'
import { Observable, tap } from 'rxjs'
import { DateAsAgoPipe } from '../../pipes/date-ago.pipe'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'

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
  private readonly modalService = inject(NgbModal)
  private readonly translocoService = inject(TranslocoService)
  readonly pushNotificationService = inject(PushNotificationService)

  notifications$!: Observable<ApiUserNotification[]>

  ngOnInit() {
    this.notifications$ = this.apiDataService.getNotifications()
    void this.initializePushNotifications()
  }

  async togglePushNotifications(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked
    if (enabled) {
      await this.pushNotificationService.enable()
    } else {
      await this.pushNotificationService.disable()
    }
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

  private async initializePushNotifications(): Promise<void> {
    // Reconcile on every open: the backend expires subscriptions on its own.
    await this.pushNotificationService.refresh()
    if (!this.pushNotificationService.shouldShowInitialPrompt()) return

    this.pushNotificationService.markInitialPromptSeen()
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      'notification.push_prompt_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'notification.push_prompt_message',
    )
    modalRef.componentInstance.okLabel = 'notification.push_enable'
    modalRef.componentInstance.cancelLabel = 'notification.push_not_now'
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        tap((accepted) => {
          if (accepted) void this.pushNotificationService.enable()
        }),
      )
      .subscribe()
  }
}
