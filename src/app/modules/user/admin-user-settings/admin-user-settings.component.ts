import { HttpErrorResponse } from '@angular/common/http'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  computed,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiAdminUser } from '@models'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { filter, of, switchMap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-admin-user-settings',
  templateUrl: './admin-user-settings.component.html',
  styleUrl: './admin-user-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class AdminUserSettingsComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly modalService = inject(NgbModal)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  readonly activeModal = inject(NgbActiveModal)

  @Input({ required: true }) identifier!: string
  @Output() readonly rolesChanged = new EventEmitter<string[]>()
  readonly user = signal<ApiAdminUser | undefined>(undefined)
  readonly loading = signal(true)
  readonly loadError = signal<'not-found' | 'error' | undefined>(undefined)
  readonly saving = signal(false)
  readonly activeAction = signal<'validate' | 'password-reset' | undefined>(
    undefined,
  )
  readonly draftAdmin = signal(false)
  readonly draftRoles = signal<Set<string>>(new Set())
  readonly dirty = computed(() => {
    const user = this.user()
    if (!user) return false
    return (
      this.draftAdmin() !== user.admin ||
      JSON.stringify([...this.draftRoles()].sort()) !==
        JSON.stringify([...user.roles].sort())
    )
  })

  ngOnInit(): void {
    this.load(this.identifier)
  }

  toggleAdmin(event: Event): void {
    this.draftAdmin.set((event.target as HTMLInputElement).checked)
  }

  toggleRole(role: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked
    this.draftRoles.update((roles) => {
      const next = new Set(roles)
      if (checked) {
        next.add(role)
      } else {
        next.delete(role)
      }
      return next
    })
  }

  reset(): void {
    const user = this.user()
    if (user) this.apply(user)
  }

  save(): void {
    if (!this.dirty() || this.saving()) return
    const access = {
      admin: this.draftAdmin(),
      roles: [...this.draftRoles()].sort(),
    }
    const confirmation =
      access.admin !== this.user()?.admin
        ? this.confirm('confirm_access_title', 'confirm_access_message')
        : of(true)
    confirmation
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.saving.set(true)
          return this.apiDataService.updateAdminUserAccess(
            this.identifier,
            access,
          )
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: (user) => {
          this.apply(user)
          this.rolesChanged.emit(user.roles)
          this.success('access_saved')
        },
        error: () => {
          this.saving.set(false)
          this.failure('access_save_error')
        },
      })
  }

  validateAccount(): void {
    if (this.user()?.validated || this.activeAction()) return
    this.confirm('confirm_validate_title', 'confirm_validate_message')
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.activeAction.set('validate')
          return this.apiDataService.validateAdminUser(this.identifier)
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: (user) => {
          this.apply(user)
          this.activeAction.set(undefined)
          this.success('account_validated')
        },
        error: () => {
          this.activeAction.set(undefined)
          this.failure('validate_error')
        },
      })
  }

  sendPasswordReset(): void {
    if (this.activeAction()) return
    this.confirm('confirm_reset_title', 'confirm_reset_message')
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.activeAction.set('password-reset')
          return this.apiDataService.sendAdminUserPasswordReset(this.identifier)
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: () => {
          this.activeAction.set(undefined)
          this.success('password_reset_sent')
        },
        error: (error: HttpErrorResponse) => {
          this.activeAction.set(undefined)
          this.failure(
            error.status === 429
              ? 'password_reset_cooldown'
              : 'password_reset_error',
          )
        },
      })
  }

  private load(identifier: string): void {
    this.loading.set(true)
    this.loadError.set(undefined)
    this.user.set(undefined)
    this.apiDataService
      .getAdminUser(identifier)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (user) => {
          this.apply(user)
          this.loading.set(false)
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false)
          this.loadError.set(error.status === 404 ? 'not-found' : 'error')
          this.changeDetectorRef.markForCheck()
        },
      })
  }

  private apply(user: ApiAdminUser): void {
    this.user.set(user)
    this.draftAdmin.set(user.admin)
    this.draftRoles.set(new Set(user.roles))
    this.saving.set(false)
    this.changeDetectorRef.markForCheck()
  }

  private confirm(title: string, message: string) {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'sm',
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      `admin_user.${title}`,
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      `admin_user.${message}`,
      { user: this.user()?.user ?? this.identifier },
    )
    return modalRef.closed
  }

  private success(key: string): void {
    this.toastService.show(
      this.translocoService.translate(`admin_user.${key}`),
      {
        classname: 'bg-success text-light',
        delay: 3000,
      },
    )
  }

  private failure(key: string): void {
    this.toastService.show(
      this.translocoService.translate(`admin_user.${key}`),
      {
        classname: 'bg-danger text-light',
        delay: 5000,
      },
    )
  }
}
