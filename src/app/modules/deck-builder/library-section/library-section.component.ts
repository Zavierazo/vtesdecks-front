import {
  AsyncPipe,
  Location,
  NgClass,
  NgTemplateOutlet,
  ViewportScroller,
} from '@angular/common'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DOCUMENT,
  inject,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiLibrary, LibraryFilter, LibrarySortBy } from '@models'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { ToggleIconComponent } from '@shared/components/toggle-icon/toggle-icon.component'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { LibraryQuery } from '@state/library/library.query'
import { isRegexSearch } from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import {
  BehaviorSubject,
  debounceTime,
  fromEvent,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs'
import { LibraryGridCardComponent } from '../../deck-shared/library-grid-card/library-grid-card.component'
import { LibraryComponent } from '../../deck-shared/library/library.component'
import { LibraryBuilderFilterComponent } from '../library-builder-filter/library-builder-filter.component'
import { LibraryCardComponent } from './../../deck-shared/library-card/library-card.component'

@UntilDestroy()
@Component({
  selector: 'app-library-section',
  templateUrl: './library-section.component.html',
  styleUrls: ['./library-section.component.scss'],
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
    NgbTooltip,
    LibraryBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
    ToggleIconComponent,
    LibraryGridCardComponent,
  ],
})
export class LibrarySectionComponent implements OnInit {
  private readonly document = inject<Document>(DOCUMENT)
  private readonly viewportService = inject(ViewportScroller)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private location = inject(Location)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = LibrarySectionComponent.PAGE_SIZE
  sortBy: LibrarySortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  libraryFilter = this.libraryQuery.getDefaultLibraryFilter()

  displayMode$ = this.authQuery.selectCardsDisplayMode()
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
    this.listenScroll()
    this.initFilters()
  }

  private updateQueryParams(params: Record<string, string | undefined>) {
    const currentParams = this.location.path().split('?')[1]
    const currentSearchParams = new URLSearchParams(currentParams || '')
    const mergedParams: Record<string, string> = {}

    // First, copy all current params from URL
    currentSearchParams.forEach((value, key) => {
      mergedParams[key] = value
    })

    // Then, apply new params (overwrite or delete)
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null) {
        delete mergedParams[key]
      } else {
        mergedParams[key] = params[key]!
      }
    })

    // Create URL with merged params
    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: mergedParams,
    })

    // Update URL without navigation
    this.location.replaceState(urlTree.toString())
  }

  get nameFilter(): string | undefined {
    return this.nameFormControl.value || undefined
  }

  get sortByTrigramSimilarity(): boolean {
    const name = this.nameFilter
    return name !== undefined && !isRegexSearch(name) && name.length > 3
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateCardsDisplayMode(displayModeValue)
  }

  openModal(content: TemplateRef<unknown>) {
    this.modalService
      .open(content)
      .dismissed.pipe(
        untilDestroyed(this),
        tap(() => this.scrollToTop()),
      )
      .subscribe()
  }

  onScroll() {
    this.limitTo += LibrarySectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  resetFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
      replaceUrl: true,
    })
    this.initDefaults()
    this.initQuery()
  }

  initFilters() {
    this.initDefaults()
    const queryParams = this.route.snapshot.queryParams
    if (queryParams['name']) {
      this.libraryFilter.name = queryParams['name']
      this.nameFormControl.patchValue(queryParams['name'], {
        emitEvent: false,
      })
    }
    if (queryParams['printOnDemand']) {
      this.libraryFilter.printOnDemand = queryParams['printOnDemand'] === 'true'
    }
    if (queryParams['set']) {
      this.libraryFilter.set = queryParams['set']
    }
    if (queryParams['title']) {
      this.libraryFilter.title = queryParams['title']
    }
    if (queryParams['sect']) {
      this.libraryFilter.sect = queryParams['sect']
    }
    if (queryParams['path']) {
      this.libraryFilter.path = queryParams['path']
    }
    if (queryParams['types']) {
      this.libraryFilter.types = queryParams['types'].split(',')
    }
    if (queryParams['clans']) {
      this.libraryFilter.clans = queryParams['clans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.libraryFilter.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['taints']) {
      this.libraryFilter.taints = queryParams['taints'].split(',')
    }
    if (queryParams['sortBy']) {
      this.sortBy = queryParams['sortBy']
    }
    if (queryParams['sortByOrder']) {
      this.sortByOrder = queryParams['sortByOrder']
    }
    if (queryParams['cardText']) {
      this.libraryFilter.cardText = queryParams['cardText']
    }
    if (queryParams['artist']) {
      this.libraryFilter.artist = queryParams['artist']
    }
    this.route.queryParams.subscribe((param) => {
      // Used when coming from card info artist link
      if (param['artist']) {
        this.onChangeLibraryFilter({
          ...this.libraryFilter,
          artist: param['artist'],
        })
      }
    })
    if (queryParams['bloodCostSlider']) {
      this.libraryFilter.bloodCostSlider = queryParams['bloodCostSlider']
        .split(',')
        .map((v: string) => +v)
    }
    if (queryParams['poolCostSlider']) {
      this.libraryFilter.poolCostSlider = queryParams['poolCostSlider']
        .split(',')
        .map((v: string) => +v)
    }
    if (queryParams['cardId'] && Object.keys(queryParams).length === 1) {
      setTimeout(() => {
        const card = this.libraryQuery.getEntity(Number(queryParams['cardId']))
        if (card) {
          this.openLibraryCard(card)
        }
      }, 300)
    }
    if (queryParams['predefinedLimitedFormat']) {
      this.libraryFilter.predefinedLimitedFormat =
        queryParams['predefinedLimitedFormat']
    }
    this.onChangeNameFilter()
    this.initQuery(true)
  }

  private initDefaults() {
    this.libraryFilter = this.libraryQuery.getDefaultLibraryFilter()
    this.nameFormControl.patchValue(this.libraryFilter.name ?? '', {
      emitEvent: false,
    })
    this.libraryFilter.printOnDemand = false
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
  }

  onChangeSortBy(sortBy: keyof ApiLibrary, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (this.sortBy === sortBy) {
      this.sortByOrder = this.sortByOrder === 'asc' ? 'desc' : 'asc'
    } else if (
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
    this.updateQueryParams({
      ['sortBy']: this.sortBy,
      ['sortByOrder']: this.sortByOrder,
    })
  }

  onChangeNameFilter() {
    this.nameFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap(() => {
          this.initQuery()
          this.libraryFilter.name = this.nameFilter || ''
          this.updateQueryParams({ ['name']: this.nameFilter })
        }),
      )
      .subscribe()
  }

  onChangeLibraryFilter(filter: LibraryFilter) {
    this.libraryFilter = filter

    const isDefaultBloodCost =
      Array.isArray(this.libraryFilter.bloodCostSlider) &&
      this.libraryFilter.bloodCostSlider[0] === 0 &&
      this.libraryFilter.bloodCostSlider[1] === 4
    const isDefaultPoolCost =
      Array.isArray(this.libraryFilter.poolCostSlider) &&
      this.libraryFilter.poolCostSlider[0] === 0 &&
      this.libraryFilter.poolCostSlider[1] === 6
    this.updateQueryParams({
      ['printOnDemand']: this.libraryFilter.printOnDemand ? 'true' : undefined,
      ['types']:
        this.libraryFilter.types && this.libraryFilter.types.length > 0
          ? this.libraryFilter.types.join(',')
          : undefined,
      ['clans']:
        this.libraryFilter.clans && this.libraryFilter.clans.length > 0
          ? this.libraryFilter.clans.join(',')
          : undefined,
      ['disciplines']:
        this.libraryFilter.disciplines &&
        this.libraryFilter.disciplines.length > 0
          ? this.libraryFilter.disciplines.join(',')
          : undefined,
      ['sect']: this.libraryFilter.sect || undefined,
      ['path']: this.libraryFilter.path || undefined,
      ['title']: this.libraryFilter.title || undefined,
      ['set']: this.libraryFilter.set || undefined,
      ['bloodCostSlider']:
        isDefaultBloodCost || !Array.isArray(this.libraryFilter.bloodCostSlider)
          ? undefined
          : this.libraryFilter.bloodCostSlider.join(','),
      ['poolCostSlider']:
        isDefaultPoolCost || !Array.isArray(this.libraryFilter.poolCostSlider)
          ? undefined
          : this.libraryFilter.poolCostSlider.join(','),
      ['taints']:
        this.libraryFilter.taints && this.libraryFilter.taints.length > 0
          ? this.libraryFilter.taints.join(',')
          : undefined,
      ['cardText']: this.libraryFilter.cardText || undefined,
      ['artist']: this.libraryFilter.artist || undefined,
      ['predefinedLimitedFormat']:
        this.libraryFilter.predefinedLimitedFormat || undefined,
    })
    this.initQuery()
  }

  initQuery(firstInitialize = false) {
    this.limitTo = LibrarySectionComponent.PAGE_SIZE
    this.updateQuery()
    if (!firstInitialize && !this.mediaService.isMobileOrTablet()) {
      this.scrollToTop()
    }
  }

  private updateQuery() {
    this.library$ = this.libraryQuery
      .selectAll({
        filter: this.libraryFilter,
        sortBy: this.sortByTrigramSimilarity
          ? 'trigramSimilarity'
          : this.sortBy,
        sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      })
      .pipe(
        tap((results) => this.resultsCount$.next(results.length)),
        switchMap((results) => of(results.slice(0, this.limitTo))),
      )
    this.changeDetector.markForCheck()
  }

  getCard(card: ApiLibrary): ApiCard {
    return {
      id: card.id,
    } as ApiCard
  }

  trackByFn(_: number, item: ApiLibrary) {
    return item.id
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }

  openLibraryCard(card: ApiLibrary): void {
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const libraryList = this.libraryQuery.getAll({
      filter: this.libraryFilter,
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
    })
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = libraryList.indexOf(card)
  }

  scrollToTop() {
    this.document
      .querySelector('.scroll-container')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  private listenScroll() {
    this.showScrollButton$ = fromEvent(this.document, 'scroll').pipe(
      untilDestroyed(this),
      map(() => this.viewportService.getScrollPosition()?.[1] > 100),
    )
  }
}
