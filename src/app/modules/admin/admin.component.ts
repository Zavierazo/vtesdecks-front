import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiAdminScheduler } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { filter, switchMap } from 'rxjs'
import { AdminUserSettingsComponent } from '../user/admin-user-settings/admin-user-settings.component'
import { FeatureFlagsComponent } from './feature-flags/feature-flags.component'

type AdminSection = 'users' | 'schedulers' | 'feature-flags'

@UntilDestroy()
@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, FeatureFlagsComponent],
})
export class AdminComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly modalService = inject(NgbModal)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  readonly activeSection = signal<AdminSection>('users')
  readonly schedulers = signal<ApiAdminScheduler[]>([])
  readonly schedulersLoading = signal(true)
  readonly runningScheduler = signal<string | undefined>(undefined)
  readonly userIdentifier = signal('')

  ngOnInit(): void {
    this.apiDataService
      .getAdminSchedulers()
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (schedulers) => {
          this.schedulers.set(schedulers)
          this.schedulersLoading.set(false)
        },
        error: () => {
          this.schedulersLoading.set(false)
          this.failure('schedulers_load_error')
        },
      })
  }

  selectSection(section: AdminSection): void {
    this.activeSection.set(section)
  }

  updateUserIdentifier(event: Event): void {
    this.userIdentifier.set((event.target as HTMLInputElement).value)
  }

  openUser(): void {
    const identifier = this.userIdentifier().trim()
    if (!identifier) return
    const modalRef = this.modalService.open(AdminUserSettingsComponent, {
      size: 'xl',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.identifier = identifier
  }

  runScheduler(scheduler: ApiAdminScheduler): void {
    if (this.runningScheduler()) return
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'sm',
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      'admin.run_scheduler_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'admin.run_scheduler_message',
      { scheduler: this.schedulerLabel(scheduler.key) },
    )
    modalRef.closed
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.runningScheduler.set(scheduler.key)
          return this.apiDataService.runAdminScheduler(scheduler.key)
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: () => {
          this.runningScheduler.set(undefined)
          this.success('scheduler_completed')
        },
        error: () => {
          this.runningScheduler.set(undefined)
          this.failure('scheduler_error')
        },
      })
  }

  schedulerLabel(key: string): string {
    return this.translocoService.translate(`admin.schedulers.${key}`)
  }

  private success(key: string): void {
    this.toastService.show(this.translocoService.translate(`admin.${key}`), {
      classname: 'bg-success text-light',
      delay: 3000,
    })
  }

  private failure(key: string): void {
    this.toastService.show(this.translocoService.translate(`admin.${key}`), {
      classname: 'bg-danger text-light',
      delay: 5000,
    })
  }
}
