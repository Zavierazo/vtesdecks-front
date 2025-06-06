import { Component, Input, inject } from '@angular/core'
import { Router } from '@angular/router'
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { filter, switchMap, tap } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from '../../services/api.data.service'
import { ToastService } from '../../services/toast.service'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'
import { TitleCasePipe } from '@angular/common'
import { TruncatePipe } from '../../shared/pipes/truncate.pipe'
import { TranslocoDatePipe } from '@jsverse/transloco-locale'

@UntilDestroy()
@Component({
  selector: 'app-deck-restorable-card',
  templateUrl: './deck-restorable-card.component.html',
  styleUrls: ['./deck-restorable-card.component.scss'],
  imports: [TitleCasePipe, TruncatePipe, TranslocoPipe, TranslocoDatePipe],
})
export class DeckRestorableCardComponent {
  private readonly router = inject(Router)
  private readonly modalService = inject(NgbModal)
  private readonly translocoService = inject(TranslocoService)
  private readonly apiDataService = inject(ApiDataService)
  private readonly toastService = inject(ToastService)

  @Input() deck!: ApiDeck

  restoreDeck() {
    const id = this.deck.id
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'sm',
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      'deck_builder.restore_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'deck_builder.restore_message',
      { name: this.deck.name },
    )
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        filter((result) => result),
        switchMap(() =>
          this.apiDataService.restoreDeckBuilder(id).pipe(
            untilDestroyed(this),
            tap(() => {
              this.toastService.show(
                this.translocoService.translate(
                  'deck_builder.restore_successful',
                ),
                { classname: 'bg-success text-light', delay: 5000 },
              )
              this.router.navigate(['/decks/builder'], { queryParams: { id } })
            }),
          ),
        ),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            { classname: 'bg-danger text-light', delay: 10000 },
          )
        },
      })
  }
}
