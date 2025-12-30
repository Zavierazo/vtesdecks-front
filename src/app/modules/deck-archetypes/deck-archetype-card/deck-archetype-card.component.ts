import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common'
import { Component, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiDeckArchetype } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { DeckArchetypeCrudService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { MarkdownTextComponent } from '@shared/components/markdown-text/markdown-text.component'
import { AuthQuery } from '@state/auth/auth.query'
import { DeckArchetypeModalComponent } from '../deck-archetype-modal/deck-archetype-modal.component'

@Component({
  selector: 'app-deck-archetype-card',
  templateUrl: './deck-archetype-card.component.html',
  styleUrls: ['./deck-archetype-card.component.scss'],
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
    modalRef.componentInstance.title = 'deck_archetype.delete_title'
    modalRef.componentInstance.message = 'deck_archetype.delete_message'
    modalRef.result.then(() => {
      this.crud.delete(archetype.id).subscribe({
        error: (err) =>
          this.toastService.show(
            err?.message || this.translocoService.translate('error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          ),
      })
    })
  }

  get metaPercentage(): number {
    const archetype = this.archetype()
    if (!archetype || archetype.metaTotal === 0) {
      return 0
    }
    return (archetype.metaCount / archetype.metaTotal) * 100 || 0
  }
}
