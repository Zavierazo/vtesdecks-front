import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { AuthQuery } from '@state/auth/auth.query'
import { catchError, EMPTY, switchMap } from 'rxjs'
import { DeckArchetypeModalComponent } from '../deck-archetype-modal/deck-archetype-modal.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-archetype-card',
  templateUrl: './deck-archetype-card.component.html',
  styleUrls: ['./deck-archetype-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    AsyncPipe,
    RouterLink,
    MarkdownTextComponent,
    DecimalPipe,
    CurrencyPipe,
  ],
})
export class DeckArchetypeCardComponent {
  private readonly modalService = inject(NgbModal)
  private readonly crud = inject(DeckArchetypeCrudService)
  private readonly authQuery = inject(AuthQuery)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  archetype = input<ApiDeckArchetype>()

  isMaintainer$ = this.authQuery.selectRole('maintainer')

  openModal(archetype: ApiDeckArchetype) {
    const modalRef = this.modalService.open(DeckArchetypeModalComponent, {
      size: 'lg',
      centered: true,
    })
    modalRef.componentInstance.init(archetype)
  }

  delete(archetype: ApiDeckArchetype) {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = this.translocoService.translate(
      'deck_archetype.delete_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'deck_archetype.delete_message',
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
}
