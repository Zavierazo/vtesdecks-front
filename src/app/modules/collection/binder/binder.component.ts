import { Clipboard } from '@angular/cdk/clipboard'
import { HttpErrorResponse } from '@angular/common/http'
import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiCollectionBinder } from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { SeoService, ToastService } from '@services'
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component'
import { PageNotFoundComponent } from '@shared/components/page-not-found/page-not-found.component'
import {
  catchError,
  EMPTY,
  throwError,
  distinctUntilChanged,
  Observable,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs'
import { environment } from '@environments/environment'
import { BinderModalComponent } from '../binder-modal/binder-modal.component'
import { CardModalComponent } from '../card-modal/card-modal.component'
import { CollectionCardsListComponent } from '../collection-cards-list/collection-cards-list.component'
import { CollectionHistoryComponent } from '../collection-history/collection-history.component'
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
    PageNotFoundComponent,
    CollectionCardsListComponent,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
    RouterLink,
    AsyncPipe,
    NgClass,
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

  binder$?: Observable<ApiCollectionBinder | undefined>
  multiSelect = false
  isPublic = false
  private readonly seo = inject(SeoService)
  unavailable = false
  private collectionService!: CollectionPrivateService | CollectionPublicService

  ngOnInit() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('binderId') ?? ''),
        distinctUntilChanged(),
        switchMap((binderId) => {
          this.isPublic = !binderId || isNaN(Number(binderId))
          this.unavailable = false
          this.binder$ = undefined
          this.collectionService = this.isPublic
            ? this.collectionPublicService
            : this.collectionPrivateService
          this.collectionService.reset()
          const request = this.isPublic
            ? this.collectionPublicService.initialize(binderId)
            : this.collectionPrivateService.initialize(Number(binderId)).pipe(
                map((collection) => {
                  const binder = collection.binders?.find(
                    (item) => item.id === Number(binderId),
                  )
                  if (!binder) throw new HttpErrorResponse({ status: 404 })
                  return binder
                }),
              )
          const path = `/collection/binders/${encodeURIComponent(binderId)}`
          return request.pipe(
            tap((binder) => {
              this.binder$ = this.collectionQuery.selectBinder(binder.id)
              this.seo.update({
                page: 'binder',
                params: { name: binder.name },
                canonicalUrl: path,
                index: this.isPublic && binder.publicVisibility === true,
                schemaType: 'CollectionPage',
              })
              this.changeDetectorRef.markForCheck()
            }),
            switchMap(() => this.collectionQuery.selectQuery()),
            distinctUntilChanged(),
            switchMap(() => this.collectionService.fetchCards()),
            catchError((error: { status?: number }) => {
              if (error.status !== 404) return throwError(() => error)
              this.unavailable = true
              this.binder$ = undefined
              this.seo.update({
                page: 'notFound',
                index: false,
                canonicalUrl: path,
              })
              this.changeDetectorRef.markForCheck()
              return EMPTY
            }),
          )
        }),
        untilDestroyed(this),
      )
      .subscribe()
  }

  onToggleMultiSelect() {
    this.multiSelect = !this.multiSelect
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
    const modalRef = this.modalService.open(CardModalComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.componentInstance.initBinder(binder.id)
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
    modalRef.componentInstance.okLabel =
      this.translocoService.translate('shared.delete')
    modalRef.componentInstance.okButtonType = 'btn-danger'
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        switchMap((confirmed: boolean) => {
          if (confirmed) {
            return this.collectionPrivateService.deleteBinder(
              binder.id!,
              deleteCards,
            )
          }
          return of(null)
        }),
        tap((deleted) => {
          if (deleted) {
            this.router.navigate(['/collection/binders'])
          }
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

  onExport(binder: ApiCollectionBinder) {
    this.collectionPrivateService
      .exportCollectionAsCsv(binder.id)
      .pipe(untilDestroyed(this))
      .subscribe()
  }

  onViewHistory(binder: ApiCollectionBinder) {
    const modalRef = this.modalService.open(CollectionHistoryComponent, {
      size: 'xl',
      centered: true,
    })
    modalRef.componentInstance.binderId = binder.id
  }
}
