import { AsyncPipe } from '@angular/common'
import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { distinctUntilChanged, switchMap } from 'rxjs'
import { BinderModalComponent } from '../binder-modal/binder-modal.component'
import { CardModalComponent } from '../card-modal/card-modal.component'
import { CollectionCardsListComponent } from '../collection-cards-list/collection-cards-list.component'
import { CollectionImportModalComponent } from '../collection-import-modal/collection-import-modal.component'
import { CollectionPrivateService } from '../state/collection-private.service'
import { CollectionQuery } from '../state/collection.query'

@UntilDestroy()
@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.scss'],
  imports: [
    TranslocoDirective,
    CollectionCardsListComponent,
    AsyncPipe,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownButtonItem,
    RouterLink,
  ],
})
export class CollectionComponent implements OnInit {
  private modalService = inject(NgbModal)
  private collectionService = inject(CollectionPrivateService)
  private collectionQuery = inject(CollectionQuery)

  binders$ = this.collectionQuery.selectBinders()

  ngOnInit() {
    this.collectionService.reset()
    this.collectionService
      .initialize()
      .pipe(
        untilDestroyed(this),
        switchMap(() => this.collectionQuery.selectQuery()),
        distinctUntilChanged(),
        switchMap(() => this.collectionService.fetchCards()),
      )
      .subscribe()
  }

  onAddBinder() {
    this.modalService.open(BinderModalComponent)
  }

  onAddCard() {
    this.modalService.open(CardModalComponent, {
      size: 'xl',
      centered: true,
    })
  }

  onImport() {
    this.modalService.open(CollectionImportModalComponent)
  }

  onExport() {
    this.collectionService
      .exportCollectionAsCsv()
      .pipe(untilDestroyed(this))
      .subscribe()
  }
}
