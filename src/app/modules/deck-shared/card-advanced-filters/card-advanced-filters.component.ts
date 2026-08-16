import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { CryptFilter, LibraryFilter } from '@models'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { isDefaultCardFilter } from '@utils'
import { Subject, debounceTime } from 'rxjs'
import { CryptBuilderFilterComponent } from '../../deck-builder/crypt-builder-filter/crypt-builder-filter.component'
import { LibraryBuilderFilterComponent } from '../../deck-builder/library-builder-filter/library-builder-filter.component'

/**
 * Full crypt/library card filters for server-paginated card lists: a sticky
 * inline panel on desktop (like the /cards pages) and a funnel button opening
 * a modal on mobile/tablet. Emits the card ids matching the filter
 * (undefined = filter inactive, [] = no card matches) so the lists can
 * restrict their rows.
 */
@UntilDestroy()
@Component({
  selector: 'app-card-advanced-filters',
  templateUrl: './card-advanced-filters.component.html',
  styleUrls: ['./card-advanced-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    AsyncPipe,
    NgTemplateOutlet,
    CryptBuilderFilterComponent,
    LibraryBuilderFilterComponent,
  ],
})
export class CardAdvancedFiltersComponent implements OnInit {
  private modalService = inject(NgbModal)
  private mediaService = inject(MediaService)
  private cryptQuery = inject(CryptQuery)
  private libraryQuery = inject(LibraryQuery)

  readonly cardType = input.required<'crypt' | 'library'>()
  readonly cardIdsChange = output<number[] | undefined>()

  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()

  // Created in ngOnInit so slider bounds reflect the loaded card catalog. The
  // defaults are kept alongside to detect the filter being untouched.
  cryptFilter?: CryptFilter
  libraryFilter?: LibraryFilter
  private cryptDefaults?: CryptFilter
  private libraryDefaults?: LibraryFilter

  readonly active = signal(false)

  private readonly filterChange$ = new Subject<void>()

  constructor() {
    this.filterChange$
      .pipe(untilDestroyed(this), debounceTime(300))
      .subscribe(() => this.emitCardIds())
  }

  ngOnInit() {
    if (this.cardType() === 'crypt' && !this.cryptFilter) {
      this.cryptDefaults = this.cryptQuery.getDefaultCryptFilter()
      this.cryptFilter = this.cryptQuery.getDefaultCryptFilter()
    } else if (this.cardType() === 'library' && !this.libraryFilter) {
      this.libraryDefaults = this.libraryQuery.getDefaultLibraryFilter()
      this.libraryFilter = this.libraryQuery.getDefaultLibraryFilter()
    }
  }

  openFilters(modal: TemplateRef<unknown>) {
    this.modalService.open(modal, { scrollable: true, centered: true })
  }

  onFilterChange() {
    this.filterChange$.next()
  }

  reset() {
    if (this.cryptFilter) {
      this.cryptFilter = this.cryptQuery.getDefaultCryptFilter()
      this.cryptDefaults = this.cryptQuery.getDefaultCryptFilter()
    }
    if (this.libraryFilter) {
      this.libraryFilter = this.libraryQuery.getDefaultLibraryFilter()
      this.libraryDefaults = this.libraryQuery.getDefaultLibraryFilter()
    }
    if (this.active()) {
      this.active.set(false)
      this.cardIdsChange.emit(undefined)
    }
  }

  private emitCardIds() {
    if (this.cardType() === 'crypt' && this.cryptFilter) {
      if (isDefaultCardFilter(this.cryptFilter, this.cryptDefaults!)) {
        this.active.set(false)
        this.cardIdsChange.emit(undefined)
      } else {
        this.active.set(true)
        this.cardIdsChange.emit(
          this.cryptQuery
            .getAll({ filter: this.cryptFilter })
            .map((card) => card.id),
        )
      }
    } else if (this.cardType() === 'library' && this.libraryFilter) {
      if (isDefaultCardFilter(this.libraryFilter, this.libraryDefaults!)) {
        this.active.set(false)
        this.cardIdsChange.emit(undefined)
      } else {
        this.active.set(true)
        this.cardIdsChange.emit(
          this.libraryQuery
            .getAll({ filter: this.libraryFilter })
            .map((card) => card.id),
        )
      }
    }
  }
}
