import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiLibrary, LibraryFilter, LibrarySortBy } from '@models'
import {
  NgbActiveModal,
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { ToggleIconComponent } from '@shared/components/toggle-icon/toggle-icon.component'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { LibraryQuery } from '@state/library/library.query'
import { isRegexSearch } from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { debounceTime, Observable, tap } from 'rxjs'
import { LibraryGridCardComponent } from '../../deck-shared/library-grid-card/library-grid-card.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'
import { LibraryBuilderFilterComponent } from '../library-builder-filter/library-builder-filter.component'

@UntilDestroy()
@Component({
  selector: 'app-library-builder',
  templateUrl: './library-builder.component.html',
  styleUrls: ['./library-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    NgClass,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    NgTemplateOutlet,
    InfiniteScrollDirective,
    LibraryComponent,
    LibraryBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
    ToggleIconComponent,
    LibraryGridCardComponent,
  ],
})
export class LibraryBuilderComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly deckBuilderQuery = inject(DeckBuilderQuery)
  private readonly deckBuilderService = inject(DeckBuilderService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private readonly changeDetector = inject(ChangeDetectorRef)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl(
    this.deckBuilderQuery.getLibraryFilter().name,
  )
  library$!: Observable<ApiLibrary[]>
  librarySize$ = this.deckBuilderQuery.selectLibrarySize()
  libraryFilter$ = this.deckBuilderQuery.selectLibraryFilter()
  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  private limitTo = LibraryBuilderComponent.PAGE_SIZE
  sortBy!: LibrarySortBy
  sortByOrder!: 'asc' | 'desc'

  displayMode$ = this.authQuery.selectBuilderDisplayMode()
  displayModeOptions = [
    {
      option: 'grid',
      icon: 'grid-fill',
      label: 'shared.grid',
    },
    {
      option: 'list',
      icon: 'list',
      label: 'shared.list',
    },
  ]

  ngOnInit() {
    this.initFilters()
    this.onChangeNameFilter()
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateBuilderDisplayMode(displayModeValue)
  }

  get nameFilter(): string | undefined {
    return this.nameFormControl.value || undefined
  }

  get sortByTrigramSimilarity(): boolean {
    const name = this.nameFilter
    return name !== undefined && !isRegexSearch(name) && name.length > 3
  }

  openModal(content: TemplateRef<unknown>) {
    this.modalService.open(content)
  }

  onScroll() {
    this.limitTo += LibraryBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  resetFilters() {
    this.deckBuilderService.resetLibraryFilter()
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.initFilters()
  }

  private initFilters() {
    if (this.deckBuilderQuery.getLimitedFormat() !== undefined) {
      this.deckBuilderService.updateLibraryFilter((filter) => ({
        ...filter,
        limitedFormat: true,
        customLimitedFormat: this.deckBuilderQuery.getLimitedFormat(),
      }))
    } else {
      this.deckBuilderService.updateLibraryFilter((filter) => ({
        ...filter,
        limitedFormat: undefined,
        customLimitedFormat: undefined,
      }))
    }
    this.sortBy = 'relevance'
    this.sortByOrder = 'desc'
    this.initQuery()
  }

  onChangeSortBy(sortBy: LibrarySortBy, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (this.sortBy === sortBy) {
      this.sortByOrder = this.sortByOrder === 'asc' ? 'desc' : 'asc'
    } else if (
      sortBy === 'relevance' ||
      sortBy === 'deckPopularity' ||
      sortBy === 'cardPopularity' ||
      sortBy === 'minPrice'
    ) {
      this.sortByOrder = 'desc'
    } else {
      this.sortByOrder = 'asc'
    }
    this.sortBy = sortBy
    this.initQuery()
  }

  onChangeNameFilter() {
    this.nameFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap((value) =>
          this.deckBuilderService.updateLibraryFilter((filter) => ({
            ...filter,
            name: value || '',
          })),
        ),
        tap(() => this.initQuery()),
      )
      .subscribe()
  }

  onChangeLibraryFilter(filter: LibraryFilter) {
    this.deckBuilderService.updateLibraryFilter(() => filter)
    this.initQuery()
  }

  initQuery() {
    this.limitTo = LibraryBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  private updateQuery() {
    this.library$ = this.libraryQuery.selectAll({
      limitTo: this.limitTo,
      filter: this.deckBuilderQuery.getLibraryFilter(),
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      stats: {
        total: this.deckBuilderQuery.getLibrarySize(),
        disciplines: this.deckBuilderQuery.getLibraryDisciplines(),
        cryptClans: this.deckBuilderQuery.getCryptClans(),
        cryptSects: this.deckBuilderQuery.getCryptSects(),
        cryptDisciplines: this.deckBuilderQuery.getCryptDisciplines(),
        cryptTotal: this.deckBuilderQuery.getCryptSize(),
      },
    })
    this.changeDetector.markForCheck()
  }

  getCard(card: ApiLibrary): ApiCard {
    const number = this.deckBuilderQuery.getCardNumber(card.id)
    return {
      id: card.id,
      number,
      collection:
        number > 0
          ? this.deckBuilderQuery.getCardCollection(card.id, number)
          : undefined,
    } as ApiCard
  }

  addCard(id: number) {
    this.deckBuilderService.addCard(id)
  }

  removeCard(id: number) {
    this.deckBuilderService.removeCard(id)
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }
}
