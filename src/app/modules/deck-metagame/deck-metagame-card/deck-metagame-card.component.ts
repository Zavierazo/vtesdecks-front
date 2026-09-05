import { AsyncPipe, CurrencyPipe, DecimalPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype, MetaType } from '@models'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { AuthQuery } from '@state/auth/auth.query'
import { getClanIcon, getDisciplineIcon } from '@utils'
import { catchError, EMPTY, switchMap } from 'rxjs'
import { DeckMetagameModalComponent } from '../deck-metagame-modal/deck-metagame-modal.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-metagame-card',
  templateUrl: './deck-metagame-card.component.html',
  styleUrls: ['./deck-metagame-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    AsyncPipe,
    RouterLink,
    MarkdownTextComponent,
    DecimalPipe,
    CurrencyPipe,
    NgbTooltip,
    NgClass,
  ],
})
export class DeckMetagameCardComponent {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)
  private readonly router = inject(Router)

  archetype = input<ApiDeckArchetype>()
  rank = input<number | undefined>()
  metaType = input<MetaType>('TOURNAMENT_365')

  isAdmin$ = this.authQuery.selectAdmin()

  navigate(archetype: ApiDeckArchetype) {
    if (archetype.id !== undefined && archetype.id > 0) {
      this.router.navigate(['/metagame', archetype.id], {
        queryParams: this.detailQueryParams,
      })
    }
  }

  onDescriptionClick(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('a')) {
      event.stopPropagation()
    }
  }

  openModal(archetype: ApiDeckArchetype) {
    const modalRef = this.modalService.open(DeckMetagameModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init(archetype)
  }

  delete(archetype: ApiDeckArchetype) {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = this.translocoService.translate(
      'deck_metagame.delete_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'deck_metagame.delete_message',
    )
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((confirmed: boolean) => {
          if (confirmed) {
            return this.crud.delete(archetype.id!)
          }
          return EMPTY
        }),
        catchError((error) => {
          if (error.status === 400 && error.error) {
            this.toastService.show(error.error, {
              classname: 'bg-danger text-light',
              delay: 5000,
            })
          } else {
            console.error('Unexpected error:', error)
            this.toastService.show(
              this.translocoService.translate('shared.unexpected_error'),
              { classname: 'bg-danger text-light', delay: 5000 },
            )
          }
          throw error
        }),
      )
      .subscribe()
  }

  get metaPercentage(): number {
    const archetype = this.archetype()
    if (!archetype || archetype.metaTotal === 0) {
      return 0
    }
    return (archetype.metaCount / archetype.metaTotal) * 100 || 0
  }

  get detailQueryParams(): { metaType: MetaType } | undefined {
    return this.metaType() === 'TOURNAMENT_365'
      ? undefined
      : { metaType: this.metaType() }
  }

  getClanIcon(clan: string): string | undefined {
    return getClanIcon(clan)
  }

  getDisciplineIcon(discipline: string): string | undefined {
    return getDisciplineIcon(discipline, false)
  }

  getProfileClans(archetype: ApiDeckArchetype): string[] {
    return (archetype.clans ?? []).filter(
      (clan) => !this.isMainIcon(getClanIcon(clan), archetype.icon),
    )
  }

  getProfileDisciplines(archetype: ApiDeckArchetype): string[] {
    return (archetype.disciplines ?? []).filter(
      (discipline) =>
        !this.isMainIcon(getDisciplineIcon(discipline, false), archetype.icon),
    )
  }

  private isMainIcon(
    profileIcon: string | undefined,
    archetypeIcon: string | undefined,
  ): boolean {
    return Boolean(
      profileIcon && archetypeIcon?.split(/\s+/).includes(profileIcon),
    )
  }
}
