import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiUserNotification } from '@models'
import { NgbActiveOffcanvas, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, PushNotificationService } from '@services'
import { AuthService } from '@state/auth/auth.service'
import { tap } from 'rxjs'
import { DateAsAgoPipe } from '../../pipes/date-ago.pipe'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'

@UntilDestroy()
@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    NgClass,
    RouterLink,
    DateAsAgoPipe,
  ],
})
export class NotificationListComponent implements OnInit {
  offcanvas = inject(NgbActiveOffcanvas)
  private readonly apiDataService = inject(ApiDataService)
  private readonly authService = inject(AuthService)
  private readonly modalService = inject(NgbModal)
  private readonly translocoService = inject(TranslocoService)
  readonly pushNotificationService = inject(PushNotificationService)

  private static readonly PAGE_SIZE = 50
  readonly notifications = signal<ApiUserNotification[]>([])
  readonly loading = signal(false)
  readonly loadError = signal(false)
  readonly hasMore = signal(true)
  private nextPage = 0

  ngOnInit() {
    this.loadMore()
    void this.initializePushNotifications()
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return
    this.loading.set(true)
    this.loadError.set(false)
    this.apiDataService
      .getNotifications(this.nextPage, NotificationListComponent.PAGE_SIZE)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (page) => {
          const byId = new Map(
            this.notifications().map((item) => [item.id, item]),
          )
          page.forEach((item) => byId.set(item.id, item))
          this.notifications.set([...byId.values()])
          this.hasMore.set(page.length === NotificationListComponent.PAGE_SIZE)
          this.nextPage += 1
          this.loading.set(false)
        },
        error: () => {
          this.loading.set(false)
          this.loadError.set(true)
        },
      })
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
