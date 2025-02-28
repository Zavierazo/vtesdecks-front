import { Component, Input, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoService } from '@ngneat/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { filter, switchMap, tap } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'
import { ApiDataService } from '../../services/api.data.service'
import { MediaService } from '../../services/media.service'
import { ToastService } from '../../services/toast.service'
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component'

@UntilDestroy()
@Component({
  selector: 'app-deck-restorable-card',
  templateUrl: './deck-restorable-card.component.html',
  styleUrls: ['./deck-restorable-card.component.scss'],
})
export class DeckRestorableCardComponent implements OnInit {
  @Input() deck!: ApiDeck

  isMobileOrTablet = false

  constructor(
    private router: Router,
    private mediaService: MediaService,
    private modalService: NgbModal,
    private translocoService: TranslocoService,
    private apiDataService: ApiDataService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.mediaService
      .observeMobileOrTablet()
      .pipe(
        untilDestroyed(this),
        tap((isMobileOrTablet) => (this.isMobileOrTablet = isMobileOrTablet)),
      )
      .subscribe()
  }

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
      {
        name: this.deck.name,
      },
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
                {
                  classname: 'bg-success text-light',
                  delay: 5000,
                },
              )
              this.router.navigate(['/decks/builder'], {
                queryParams: {
                  id,
                },
              })
            }),
          ),
        ),
      )
      .subscribe({
        error: () => {
          this.toastService.show(
            this.translocoService.translate('shared.unexpected_error'),
            {
              classname: 'bg-danger text-light',
              delay: 10000,
            },
          )
        },
      })
  }
}
