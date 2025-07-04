import { Clipboard } from '@angular/cdk/clipboard'
import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  catchError,
  distinctUntilChanged,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '../../../../environments/environment'
import { ApiCollectionBinder } from '../../../models/api-collection-binder'
import { ToastService } from '../../../services/toast.service'
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'
import { BinderModalComponent } from '../binder-modal/binder-modal.component'
import { CollectionCardsListComponent } from '../collection-cards-list/collection-cards-list.component'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionPublicService } from '../state/collection-public.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-binder',
  templateUrl: './binder.component.html',
  styleUrls: ['./binder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    CollectionCardsListComponent,
    RouterLink,
    AsyncPipe,
  ],
})
export class BinderComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private collectionPrivateService = inject(CollectionPrivateService)
  private collectionPublicService = inject(CollectionPublicService)
  private collectionQuery = inject(CollectionQuery)
  private changeDetectorRef = inject(ChangeDetectorRef)
  private modalService = inject(NgbModal)
  private toastService = inject(ToastService)
  private translocoService = inject(TranslocoService)
  private router = inject(Router)
  private clipboard = inject(Clipboard)

  binder$!: Observable<ApiCollectionBinder | undefined>
  isPublic = false
  private collectionService!: CollectionPrivateService | CollectionPublicService

  ngOnInit() {
    const binderIdParam = this.route.snapshot.params['binderId']
    if (!binderIdParam || isNaN(Number(binderIdParam))) {
      this.isPublic = true
      this.collectionService = this.collectionPublicService
      const binderId = binderIdParam
      this.collectionService.reset()
      this.collectionService
        .initialize(binderId)
        .pipe(
          untilDestroyed(this),
          tap((data) => {
            this.binder$ = this.collectionQuery.selectBinder(data.id)
            this.changeDetectorRef.markForCheck()
          }),
          switchMap(() => this.collectionQuery.selectQuery()),
          distinctUntilChanged(),
          switchMap(() => this.collectionService.fetchCards()),
        )
        .subscribe()
    } else {
      this.isPublic = false
      this.collectionService = this.collectionPrivateService
      const binderId = Number(binderIdParam)
      this.collectionService.reset()
      this.collectionService
        .initialize(binderId)
        .pipe(
          untilDestroyed(this),
          tap(() => {
            this.binder$ = this.collectionQuery.selectBinder(binderId)
            this.changeDetectorRef.markForCheck()
          }),
          switchMap(() => this.collectionQuery.selectQuery()),
          distinctUntilChanged(),
          switchMap(() => this.collectionService.fetchCards()),
        )
        .subscribe()
    }
  }

  onShare(binder: ApiCollectionBinder) {
    const url = `https://${environment.domain}/collection/binders/${binder.publicHash}`
    if (window.navigator.share) {
      ;(async () => {
        await window.navigator.share({
          url: url,
        })
      })()
    } else {
      this.clipboard.copy(url)
      this.toastService.show(
        this.translocoService.translate('deck.link_copied'),
        { classname: 'bg-success text-light', delay: 5000 },
      )
    }
  }

  onAddCard(binder: ApiCollectionBinder) {
    //TODO: Implement add card functionality
  }

  onEdit(binder: ApiCollectionBinder) {
    const modalRef = this.modalService.open(BinderModalComponent)
    modalRef.componentInstance.formBinder.patchValue({
      id: binder.id,
      name: binder.name,
      icon: binder.icon,
      publicVisibility: binder.publicVisibility,
      description: binder.description,
    })
  }

  onDelete(binder: ApiCollectionBinder, deleteCards: boolean) {
    const modalRef = this.modalService.open(ConfirmDialogComponent)
    modalRef.componentInstance.title = this.translocoService.translate(
      'collection.binder_delete_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      deleteCards
        ? 'collection.binder_delete_message_with_cards'
        : 'collection.binder_delete_message_without_cards',
      { binderName: binder.name },
    )
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((confirmed: boolean) => {
          if (confirmed) {
            return this.collectionService.deleteBinder(binder.id!, deleteCards)
          }
          return of(null)
        }),
        tap(() => {
          this.router.navigate(['/collection/binders'])
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
}
