import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCrypt, ApiLibrary } from '@models'
import {
  NgbActiveModal,
  NgbModal,
  NgbNavModule,
} from '@ng-bootstrap/ng-bootstrap'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isCryptId, isLibraryId } from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { CryptCardComponent } from '../../../deck-shared/crypt-card/crypt-card.component'
import { CryptComponent } from '../../../deck-shared/crypt/crypt.component'
import { LibraryCardComponent } from '../../../deck-shared/library-card/library-card.component'
import { LibraryComponent } from '../../../deck-shared/library/library.component'

@Component({
  selector: 'app-collection-stats-modal',
  templateUrl: './collection-stats-modal.component.html',
  styleUrls: ['./collection-stats-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    CryptComponent,
    LibraryComponent,
    InfiniteScrollDirective,
    NgbNavModule,
  ],
})
export class CollectionStatsModalComponent implements OnInit, OnChanges {
  private activeModal = inject(NgbActiveModal)
  private modalService = inject(NgbModal)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)

  @Input() title = ''
  @Input() owned: number[] = []
  @Input() missing: number[] = []

  // pagination / infinite scroll per category
  pageSize = 20
  cryptPage = 1
  libraryPage = 1
  cryptVisible: number[] = []
  libraryVisible: number[] = []

  // full lists split by category (ids)
  cryptCards: number[] = []
  libraryCards: number[] = []

  // filter: show only missing cards
  missingOnly = false

  // cached entity arrays to avoid repeated lookups
  private cryptEntities: ApiCrypt[] = []
  private libraryEntities: ApiLibrary[] = []

  activeTab: 'crypt' | 'library' = 'library'

  isCryptId = isCryptId
  isLibraryId = isLibraryId

  ngOnInit(): void {
    this.resetPagination()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['owned'] || changes['missing']) {
      this.resetPagination()
    }
  }

  private resetPagination() {
    this.cryptPage = 1
    this.libraryPage = 1
    const all = Array.from(
      new Set([...(this.owned || []), ...(this.missing || [])]),
    )

    const sourceIds = this.missingOnly
      ? Array.from(new Set(this.missing || []))
      : all

    this.cryptEntities = sourceIds
      .filter((id) => isCryptId(id))
      .map((id) => this.cryptQuery.getEntity(id))
      .filter(Boolean) as ApiCrypt[]
    this.cryptEntities.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    this.cryptCards = this.cryptEntities.map((e) => e.id)

    this.libraryEntities = sourceIds
      .filter((id) => isLibraryId(id))
      .map((id) => this.libraryQuery.getEntity(id))
      .filter(Boolean) as ApiLibrary[]
    this.libraryEntities.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    this.libraryCards = this.libraryEntities.map((e) => e.id)

    this.cryptVisible = this.cryptCards.slice(0, this.pageSize)
    this.libraryVisible = this.libraryCards.slice(0, this.pageSize)

    if (this.cryptCards.length && !this.libraryCards.length) {
      this.activeTab = 'crypt'
    } else {
      this.activeTab = 'library'
    }
  }

  onClose() {
    this.activeModal.close()
  }

  openCrypt(id: number) {
    const cryptList = this.cryptEntities
    const currentIndex = cryptList.findIndex(
      (crypt: ApiCrypt) => crypt.id === id,
    )
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = currentIndex >= 0 ? currentIndex : 0
  }

  openLibrary(id: number) {
    const libraryList = this.libraryEntities
    const currentIndex = libraryList.findIndex(
      (library: ApiLibrary) => library.id === id,
    )
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = currentIndex >= 0 ? currentIndex : 0
  }

  onScroll() {
    if (this.activeTab === 'crypt') {
      this.loadMoreCrypt()
    } else {
      this.loadMoreLibrary()
    }
  }

  private loadMoreCrypt() {
    if (this.cryptVisible.length >= this.cryptCards.length) return
    this.cryptPage++
    this.cryptVisible = this.cryptCards.slice(0, this.cryptPage * this.pageSize)
  }

  private loadMoreLibrary() {
    if (this.libraryVisible.length >= this.libraryCards.length) return
    this.libraryPage++
    this.libraryVisible = this.libraryCards.slice(
      0,
      this.libraryPage * this.pageSize,
    )
  }

  toggleMissingOnly() {
    this.missingOnly = !this.missingOnly
    this.resetPagination()
  }

  trackById(_index: number, id: number) {
    return id
  }
}
