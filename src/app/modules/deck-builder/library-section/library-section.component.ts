import {
  AsyncPipe,
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
import { ActivatedRoute, Params, Router } from '@angular/router'
import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco'
import { ApiCard, ApiLibrary, LibraryFilter, LibrarySortBy } from '@models'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  CardShopAvailabilityService,
  MediaService,
  SearchFeaturesService,
  SeoService,
  ToastService,
} from '@services'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import {
  FilterChip,
  FilterChipsComponent,
} from '@shared/components/filter-chips/filter-chips.component'
import { StickyHeaderDirective } from '@shared/directives/sticky-header.directive'
import { SearchFeaturesButtonComponent } from '@shared/components/search-features/search-features-button.component'
import {
  SortControlComponent,
  SortOption,
} from '@shared/components/sort-control/sort-control.component'
import { ToggleIconComponent } from '@shared/components/toggle-icon/toggle-icon.component'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { LibraryQuery } from '@state/library/library.query'
import {
  buildLibraryFilterChips,
  filterCardsByShopAvailability,
  getCardShopName,
  getValidCardShopNames,
  isRegexSearch,
  normalizeSetSelection,
  removeCardFilterChip,
} from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs'
import { CameraScannerComponent } from '../../../shared/components/camera-scanner/camera-scanner.component'
import { LibraryGridCardComponent } from '@deck-shared/library-grid-card/library-grid-card.component'
import { LibraryComponent } from '@deck-shared/library/library.component'
import { LibraryBuilderFilterComponent } from '../library-builder-filter/library-builder-filter.component'
import { LibraryCardComponent } from './../../deck-shared/library-card/library-card.component'
import { scrollContainerIntoView } from '../../../shared/utils/scroll.util'

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
    NgTemplateOutlet,
    InfiniteScrollDirective,
    LibraryComponent,
    NgbTooltip,
    LibraryBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
    ToggleIconComponent,
    LibraryGridCardComponent,
    AdSenseComponent,
    SortControlComponent,
    FilterChipsComponent,
    StickyHeaderDirective,
    SearchFeaturesButtonComponent,
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
  private readonly seoService = inject(SeoService)
  private readonly translocoService = inject(TranslocoService)
  private router = inject(Router)
  private readonly searchFeatures = inject(SearchFeaturesService)
  private readonly cardShopAvailability = inject(CardShopAvailabilityService)
  private readonly toastService = inject(ToastService)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)
  hasMore$ = new BehaviorSubject<boolean>(true)
  private readonly shopSelection$ = new Subject<{
    shops: string[]
    notShops: string[]
  }>()
  private readonly availabilityByShop = new Map<string, ReadonlySet<number>>()

  private limitTo = LibrarySectionComponent.PAGE_SIZE
  readonly sortOptions: SortOption[] = [
    { value: 'name', labelKey: 'library_section.name' },
    { value: 'type', labelKey: 'library_section.type' },
    {
      value: 'deckPopularity',
      labelKey: 'library_section.deck_popularity',
      titleKey: 'library_section.deck_popularity_title',
    },
    {
      value: 'cardPopularity',
      labelKey: 'library_section.card_popularity',
      titleKey: 'library_section.card_popularity_title',
    },
    { value: 'minPrice', labelKey: 'library_section.price' },
  ]
  private readonly relevanceOption: SortOption = {
    value: 'trigramSimilarity',
    labelKey: 'library_section.relevance',
  }
  sortBy: LibrarySortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  libraryFilter = this.libraryQuery.getDefaultLibraryFilter()
  filterChips: FilterChip[] = []

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
    this.seoService.update({
      title: 'Library',
      description:
        'Browse and search the complete VTES Library card database. Find action, reaction, equipment, and combat cards by type, discipline, and clan.',
      canonicalUrl: 'https://vtesdecks.com/cards/library',
    })
    this.listenScroll()
    this.onChangeNameFilter()
    this.listenShopAvailability()
    this.route.queryParams
      .pipe(
        untilDestroyed(this),
        tap((params) => this.initFilters(params)),
      )
      .subscribe()
    // Chip labels are translated eagerly, so rebuild them once the active
    // language file lands and whenever the user switches language.
    merge(
      this.translocoService.langChanges$,
      this.translocoService.events$.pipe(
        filter((event) => event.type === 'translationLoadSuccess'),
      ),
    )
      .pipe(
        untilDestroyed(this),
        tap(() => {
          this.updateFilterChips()
          this.changeDetector.markForCheck()
        }),
      )
      .subscribe()
  }

  private get defaultLibraryFilter(): LibraryFilter {
    return {
      ...this.libraryQuery.getDefaultLibraryFilter(),
      printOnDemand: false,
      shops: [],
      notShops: [],
    }
  }

  private updateFilterChips() {
    this.filterChips = buildLibraryFilterChips(
      this.libraryFilter,
      this.defaultLibraryFilter,
      (key, params) => this.translocoService.translate(key, params),
      getCardShopName,
    )
  }

  onRemoveFilterChip(chip: FilterChip) {
    this.onChangeLibraryFilter(
      removeCardFilterChip(this.libraryFilter, this.defaultLibraryFilter, chip),
    )
  }

  private updateQueryParams(params: Record<string, string | undefined>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    })
  }

  get nameFilter(): string | undefined {
    return this.nameFormControl.value || undefined
  }

  get sortByTrigramSimilarity(): boolean {
    const name = this.nameFilter
    return name !== undefined && !isRegexSearch(name) && name.length > 3
  }

  get displayedSortOptions(): SortOption[] {
    return this.sortByTrigramSimilarity
      ? [this.relevanceOption, ...this.sortOptions]
      : this.sortOptions
  }

  get displayedSortBy(): string {
    return this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy
  }

  get displayedSortByOrder(): 'asc' | 'desc' {
    return this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateCardsDisplayMode(displayModeValue)
  }

  openModal(content: TemplateRef<unknown>) {
    this.modalService
      // Scrollable keeps the footer (reset/apply) in view like the decks
      // filters offcanvas, instead of pushing it below the filter list.
      .open(content, { scrollable: true })
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
    // Closes the recent-search entry being rewritten so the next search is
    // stored as a new one.
    this.searchFeatures.finalizeHistoryDraft('library')
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'replace',
      replaceUrl: true,
    })
    this.initDefaults()
    this.updateFilterChips()
    this.initQuery()
  }

  initFilters(queryParams: Params = this.route.snapshot.queryParams) {
    this.initDefaults()
    if (queryParams['name']) {
      this.libraryFilter.name = queryParams['name']
      this.nameFormControl.patchValue(queryParams['name'], {
        emitEvent: false,
      })
    }
    if (queryParams['printOnDemand']) {
      this.libraryFilter.printOnDemand = queryParams['printOnDemand'] === 'true'
    }
    const notShops = getValidCardShopNames(queryParams['notShops']?.split(','))
    const shops = getValidCardShopNames(
      queryParams['shops']?.split(',') ??
        (queryParams['shop'] ? [queryParams['shop']] : []),
    ).filter((shop) => !notShops.includes(shop))
    this.libraryFilter.shops = shops
    this.libraryFilter.notShops = notShops
    this.shopSelection$.next({ shops, notShops })
    if (queryParams['shop']) {
      this.updateQueryParams({
        shop: undefined,
        shops: shops.join(',') || undefined,
      })
    }
    const { sets, notSets } = normalizeSetSelection(
      queryParams['sets']?.split(',') ??
        (queryParams['set'] ? [queryParams['set']] : []),
      queryParams['notSets']?.split(',') ?? [],
    )
    this.libraryFilter.sets = sets
    this.libraryFilter.notSets = notSets
    if (queryParams['set']) {
      this.updateQueryParams({
        set: undefined,
        sets: sets.join(',') || undefined,
      })
    }
    if (queryParams['title']) {
      this.libraryFilter.title = queryParams['title']
    }
    if (queryParams['sect']) {
      this.libraryFilter.sect = queryParams['sect']
    }
    if (queryParams['paths']) {
      this.libraryFilter.paths = queryParams['paths'].split(',')
    }
    if (queryParams['notPaths']) {
      this.libraryFilter.notPaths = queryParams['notPaths'].split(',')
    }
    if (queryParams['types']) {
      this.libraryFilter.types = queryParams['types'].split(',')
    }
    if (queryParams['notTypes']) {
      this.libraryFilter.notTypes = queryParams['notTypes'].split(',')
    }
    if (queryParams['typeMode'] === 'and') {
      this.libraryFilter.typeMode = 'and'
    }
    if (queryParams['clans']) {
      this.libraryFilter.clans = queryParams['clans'].split(',')
    }
    if (queryParams['notClans']) {
      this.libraryFilter.notClans = queryParams['notClans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.libraryFilter.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['notDisciplines']) {
      this.libraryFilter.notDisciplines =
        queryParams['notDisciplines'].split(',')
    }
    if (queryParams['disciplineMode'] === 'or') {
      this.libraryFilter.disciplineMode = 'or'
    }
    if (queryParams['taints']) {
      this.libraryFilter.taints = queryParams['taints'].split(',')
    }
    if (
      queryParams['sortBy'] &&
      this.sortOptions.some((option) => option.value === queryParams['sortBy'])
    ) {
      this.sortBy = queryParams['sortBy']
    }
    if (
      queryParams['sortByOrder'] === 'asc' ||
      queryParams['sortByOrder'] === 'desc'
    ) {
      this.sortByOrder = queryParams['sortByOrder']
    }
    if (queryParams['cardText']) {
      this.libraryFilter.cardText = queryParams['cardText']
    }
    if (queryParams['artist']) {
      this.libraryFilter.artist = queryParams['artist']
    }
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
    if (queryParams['convictionCostSlider']) {
      this.libraryFilter.convictionCostSlider = queryParams[
        'convictionCostSlider'
      ]
        .split(',')
        .map((v: string) => +v)
    }
    if (
      queryParams['trifle'] === 'trifle' ||
      queryParams['trifle'] === 'non_trifle'
    ) {
      this.libraryFilter.trifle = queryParams['trifle']
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
    this.updateFilterChips()
    this.initQuery(true)
  }

  private initDefaults() {
    this.libraryFilter = this.libraryQuery.getDefaultLibraryFilter()
    this.nameFormControl.patchValue(this.libraryFilter.name ?? '', {
      emitEvent: false,
    })
    this.libraryFilter.printOnDemand = false
    this.libraryFilter.shops = []
    this.libraryFilter.notShops = []
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
  }

  onChangeSortBy(sortBy: LibrarySortBy) {
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
          this.updateQueryParams({ ['name']: this.nameFilter })
        }),
      )
      .subscribe()
  }

  onChangeLibraryFilter(filter: LibraryFilter) {
    this.libraryFilter = filter
    this.shopSelection$.next({
      shops: this.libraryFilter.shops ?? [],
      notShops: this.libraryFilter.notShops ?? [],
    })

    const isDefaultBloodCost =
      Array.isArray(this.libraryFilter.bloodCostSlider) &&
      this.libraryFilter.bloodCostSlider[0] === 0 &&
      this.libraryFilter.bloodCostSlider[1] === 4
    const isDefaultPoolCost =
      Array.isArray(this.libraryFilter.poolCostSlider) &&
      this.libraryFilter.poolCostSlider[0] === 0 &&
      this.libraryFilter.poolCostSlider[1] === 6
    const isDefaultConvictionCost =
      Array.isArray(this.libraryFilter.convictionCostSlider) &&
      this.libraryFilter.convictionCostSlider[0] === 0 &&
      this.libraryFilter.convictionCostSlider[1] ===
        this.libraryQuery.getMaxConvictionCost()
    this.updateQueryParams({
      ['printOnDemand']: this.libraryFilter.printOnDemand ? 'true' : undefined,
      ['set']: undefined,
      ['shop']: undefined,
      ['shops']:
        this.libraryFilter.shops && this.libraryFilter.shops.length > 0
          ? this.libraryFilter.shops.join(',')
          : undefined,
      ['notShops']:
        this.libraryFilter.notShops && this.libraryFilter.notShops.length > 0
          ? this.libraryFilter.notShops.join(',')
          : undefined,
      ['types']:
        this.libraryFilter.types && this.libraryFilter.types.length > 0
          ? this.libraryFilter.types.join(',')
          : undefined,
      ['notTypes']:
        this.libraryFilter.notTypes && this.libraryFilter.notTypes.length > 0
          ? this.libraryFilter.notTypes.join(',')
          : undefined,
      ['typeMode']: this.libraryFilter.typeMode === 'and' ? 'and' : undefined,
      ['clans']:
        this.libraryFilter.clans && this.libraryFilter.clans.length > 0
          ? this.libraryFilter.clans.join(',')
          : undefined,
      ['notClans']:
        this.libraryFilter.notClans && this.libraryFilter.notClans.length > 0
          ? this.libraryFilter.notClans.join(',')
          : undefined,
      ['disciplines']:
        this.libraryFilter.disciplines &&
        this.libraryFilter.disciplines.length > 0
          ? this.libraryFilter.disciplines.join(',')
          : undefined,
      ['notDisciplines']:
        this.libraryFilter.notDisciplines &&
        this.libraryFilter.notDisciplines.length > 0
          ? this.libraryFilter.notDisciplines.join(',')
          : undefined,
      ['disciplineMode']:
        this.libraryFilter.disciplineMode === 'or' ? 'or' : undefined,
      ['sect']: this.libraryFilter.sect || undefined,
      ['paths']:
        this.libraryFilter.paths && this.libraryFilter.paths.length > 0
          ? this.libraryFilter.paths.join(',')
          : undefined,
      ['notPaths']:
        this.libraryFilter.notPaths && this.libraryFilter.notPaths.length > 0
          ? this.libraryFilter.notPaths.join(',')
          : undefined,
      ['title']: this.libraryFilter.title || undefined,
      ['sets']:
        this.libraryFilter.sets && this.libraryFilter.sets.length > 0
          ? this.libraryFilter.sets.join(',')
          : undefined,
      ['notSets']:
        this.libraryFilter.notSets && this.libraryFilter.notSets.length > 0
          ? this.libraryFilter.notSets.join(',')
          : undefined,
      ['bloodCostSlider']:
        isDefaultBloodCost || !Array.isArray(this.libraryFilter.bloodCostSlider)
          ? undefined
          : this.libraryFilter.bloodCostSlider.join(','),
      ['poolCostSlider']:
        isDefaultPoolCost || !Array.isArray(this.libraryFilter.poolCostSlider)
          ? undefined
          : this.libraryFilter.poolCostSlider.join(','),
      ['convictionCostSlider']:
        isDefaultConvictionCost ||
        !Array.isArray(this.libraryFilter.convictionCostSlider)
          ? undefined
          : this.libraryFilter.convictionCostSlider.join(','),
      ['trifle']: this.libraryFilter.trifle || undefined,
      ['taints']:
        this.libraryFilter.taints && this.libraryFilter.taints.length > 0
          ? this.libraryFilter.taints.join(',')
          : undefined,
      ['cardText']: this.libraryFilter.cardText || undefined,
      ['artist']: this.libraryFilter.artist || undefined,
      ['predefinedLimitedFormat']:
        this.libraryFilter.predefinedLimitedFormat || undefined,
    })
    this.updateFilterChips()
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
        map((results) =>
          filterCardsByShopAvailability(
            results,
            this.libraryFilter.shops,
            this.libraryFilter.notShops,
            this.availabilityByShop,
          ),
        ),
        tap((results) => this.resultsCount$.next(results.length)),
        switchMap((results) => {
          const sliced = results.slice(0, this.limitTo)
          this.hasMore$.next(sliced.length < results.length)
          return of(sliced)
        }),
      )
    this.changeDetector.markForCheck()
  }

  private listenShopAvailability(): void {
    this.shopSelection$
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a.shops.join(',') === b.shops.join(',') &&
            a.notShops.join(',') === b.notShops.join(','),
        ),
        switchMap((selection) => {
          const missing = [
            ...new Set([...selection.shops, ...selection.notShops]),
          ].filter((shop) => !this.availabilityByShop.has(shop))
          return this.cardShopAvailability
            .getInStockForShops(missing)
            .pipe(map((batch) => ({ selection, batch })))
        }),
        untilDestroyed(this),
      )
      .subscribe(({ selection, batch }) => {
        batch.availabilityByShop.forEach((ids, shop) =>
          this.availabilityByShop.set(shop, ids),
        )
        if (batch.failedShops.length > 0) {
          const failed = new Set(batch.failedShops)
          this.libraryFilter = {
            ...this.libraryFilter,
            shops: selection.shops.filter((shop) => !failed.has(shop)),
            notShops: selection.notShops.filter((shop) => !failed.has(shop)),
          }
          this.toastService.show(
            this.translocoService.translate('shared.shop_availability_error'),
            { classname: 'bg-danger text-light' },
          )
          this.updateQueryParams({
            shop: undefined,
            shops: this.libraryFilter.shops?.join(',') || undefined,
            notShops: this.libraryFilter.notShops?.join(',') || undefined,
          })
        }
        this.updateFilterChips()
        this.initQuery()
      })
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
    const libraryList = filterCardsByShopAvailability(
      this.libraryQuery.getAll({
        filter: this.libraryFilter,
        sortBy: this.sortByTrigramSimilarity
          ? 'trigramSimilarity'
          : this.sortBy,
        sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      }),
      this.libraryFilter.shops,
      this.libraryFilter.notShops,
      this.availabilityByShop,
    )
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = libraryList.indexOf(card)
  }

  openCameraScanner(): void {
    const modalRef = this.modalService.open(CameraScannerComponent, {
      size: 'lg',
      centered: true,
      modalDialogClass: 'modal-camera-scanner',
    })
    modalRef.componentInstance.idOnly.set(true)
  }

  scrollToTop() {
    scrollContainerIntoView(this.document)
  }

  private listenScroll() {
    this.showScrollButton$ = fromEvent(this.document, 'scroll').pipe(
      untilDestroyed(this),
      map(() => this.viewportService.getScrollPosition()?.[1] > 100),
    )
  }
}
