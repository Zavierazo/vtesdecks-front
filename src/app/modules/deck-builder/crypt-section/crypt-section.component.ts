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
import { ApiCard, ApiCrypt, CryptFilter, CryptSortBy } from '@models'
import { NgbModal, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService, SeoService } from '@services'
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
import { CryptQuery } from '@state/crypt/crypt.query'
import {
  buildCryptFilterChips,
  isRegexSearch,
  removeCardFilterChip,
} from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import {
  BehaviorSubject,
  debounceTime,
  filter,
  fromEvent,
  map,
  merge,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs'
import { CameraScannerComponent } from '../../../shared/components/camera-scanner/camera-scanner.component'
import { CryptGridCardComponent } from '@deck-shared/crypt-grid-card/crypt-grid-card.component'
import { CryptComponent } from '@deck-shared/crypt/crypt.component'
import { CryptBuilderFilterComponent } from '../crypt-builder-filter/crypt-builder-filter.component'
import { CryptCardComponent } from './../../deck-shared/crypt-card/crypt-card.component'
import { scrollContainerIntoView } from '../../../shared/utils/scroll.util'

@UntilDestroy()
@Component({
  selector: 'app-crypt-section',
  templateUrl: './crypt-section.component.html',
  styleUrls: ['./crypt-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    NgClass,
    NgTemplateOutlet,
    InfiniteScrollDirective,
    CryptComponent,
    NgbTooltip,
    CryptBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
    ToggleIconComponent,
    CryptGridCardComponent,
    AdSenseComponent,
    SortControlComponent,
    FilterChipsComponent,
    StickyHeaderDirective,
    SearchFeaturesButtonComponent,
  ],
})
export class CryptSectionComponent implements OnInit {
  private readonly document = inject<Document>(DOCUMENT)
  private readonly viewportService = inject(ViewportScroller)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private route = inject(ActivatedRoute)
  private readonly seoService = inject(SeoService)
  private readonly translocoService = inject(TranslocoService)
  private router = inject(Router)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)
  hasMore$ = new BehaviorSubject<boolean>(true)

  private limitTo = CryptSectionComponent.PAGE_SIZE
  readonly sortOptions: SortOption[] = [
    { value: 'name', labelKey: 'crypt_section.name' },
    { value: 'capacity', labelKey: 'crypt_section.capacity' },
    { value: 'clan', labelKey: 'crypt_section.clan' },
    { value: 'group', labelKey: 'crypt_section.group' },
    {
      value: 'deckPopularity',
      labelKey: 'crypt_section.deck_popularity',
      titleKey: 'crypt_section.deck_popularity_title',
    },
    {
      value: 'cardPopularity',
      labelKey: 'crypt_section.card_popularity',
      titleKey: 'crypt_section.card_popularity_title',
    },
    { value: 'minPrice', labelKey: 'crypt_section.price' },
  ]
  private readonly relevanceOption: SortOption = {
    value: 'trigramSimilarity',
    labelKey: 'crypt_section.relevance',
  }
  sortBy: CryptSortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  cryptFilter = this.cryptQuery.getDefaultCryptFilter()
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
      title: 'Crypt',
      description:
        'Browse and search the complete VTES Crypt card database. Find vampire cards by clan, discipline, capacity, and more.',
      canonicalUrl: 'https://vtesdecks.com/cards/crypt',
    })
    this.listenScroll()
    this.onChangeNameFilter()
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

  private get defaultCryptFilter(): CryptFilter {
    return { ...this.cryptQuery.getDefaultCryptFilter(), printOnDemand: false }
  }

  private updateFilterChips() {
    this.filterChips = buildCryptFilterChips(
      this.cryptFilter,
      this.defaultCryptFilter,
      (key, params) => this.translocoService.translate(key, params),
    )
  }

  onRemoveFilterChip(chip: FilterChip) {
    this.onChangeCryptFilter(
      removeCardFilterChip(this.cryptFilter, this.defaultCryptFilter, chip),
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
      .open(content)
      .dismissed.pipe(
        untilDestroyed(this),
        tap(() => this.scrollToTop()),
      )
      .subscribe()
  }

  onScroll() {
    this.limitTo += CryptSectionComponent.PAGE_SIZE
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
    this.updateFilterChips()
    this.initQuery()
  }

  initFilters(queryParams: Params = this.route.snapshot.queryParams) {
    this.initDefaults()
    if (queryParams['name']) {
      this.cryptFilter.name = queryParams['name']
      this.nameFormControl.patchValue(queryParams['name'], {
        emitEvent: false,
      })
    }
    if (queryParams['printOnDemand']) {
      this.cryptFilter.printOnDemand = queryParams['printOnDemand'] === 'true'
    }
    if (queryParams['set']) {
      this.cryptFilter.set = queryParams['set']
    }
    if (queryParams['title']) {
      this.cryptFilter.title = queryParams['title']
    }
    if (queryParams['sect']) {
      this.cryptFilter.sect = queryParams['sect']
    }
    if (queryParams['paths']) {
      this.cryptFilter.paths = queryParams['paths'].split(',')
    }
    if (queryParams['notPaths']) {
      this.cryptFilter.notPaths = queryParams['notPaths'].split(',')
    }
    if (queryParams['clans']) {
      this.cryptFilter.clans = queryParams['clans'].split(',')
    }
    if (queryParams['notClans']) {
      this.cryptFilter.notClans = queryParams['notClans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.cryptFilter.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['superiorDisciplines']) {
      this.cryptFilter.superiorDisciplines =
        queryParams['superiorDisciplines'].split(',')
    }
    if (queryParams['notDisciplines']) {
      this.cryptFilter.notDisciplines = queryParams['notDisciplines'].split(',')
    }
    if (queryParams['disciplineMode'] === 'or') {
      this.cryptFilter.disciplineMode = 'or'
    }
    if (queryParams['group']) {
      this.cryptFilter.groupSlider = queryParams['group']
        .split(',')
        .map((v: string) => +v)
    }
    if (queryParams['capacity']) {
      this.cryptFilter.capacitySlider = queryParams['capacity']
        .split(',')
        .map((v: string) => +v)
    }
    if (
      queryParams['advanced'] === 'base' ||
      queryParams['advanced'] === 'advanced'
    ) {
      this.cryptFilter.advanced = queryParams['advanced']
    }
    if (queryParams['taints']) {
      this.cryptFilter.taints = queryParams['taints'].split(',')
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
      this.cryptFilter.cardText = queryParams['cardText']
    }
    if (queryParams['artist']) {
      this.cryptFilter.artist = queryParams['artist']
    }
    if (queryParams['cardId'] && Object.keys(queryParams).length === 1) {
      setTimeout(() => {
        const card = this.cryptQuery.getEntity(Number(queryParams['cardId']))
        if (card) {
          this.openCryptCard(card)
        }
      }, 300)
    }
    if (queryParams['predefinedLimitedFormat']) {
      this.cryptFilter.predefinedLimitedFormat =
        queryParams['predefinedLimitedFormat']
    }
    this.updateFilterChips()
    this.initQuery(true)
  }

  private initDefaults() {
    this.cryptFilter = this.cryptQuery.getDefaultCryptFilter()
    this.nameFormControl.patchValue(this.cryptFilter.name ?? '', {
      emitEvent: false,
    })
    this.cryptFilter.printOnDemand = false
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
  }

  onChangeSortBy(sortBy: CryptSortBy) {
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

  onChangeCryptFilter(filter: CryptFilter) {
    this.cryptFilter = filter
    const isDefaultGroup =
      Array.isArray(this.cryptFilter.groupSlider) &&
      this.cryptFilter.groupSlider[0] === 1 &&
      this.cryptFilter.groupSlider[1] === this.cryptQuery.getMaxGroup()
    const isDefaultCapacity =
      Array.isArray(this.cryptFilter.capacitySlider) &&
      this.cryptFilter.capacitySlider[0] === 1 &&
      this.cryptFilter.capacitySlider[1] === this.cryptQuery.getMaxCapacity()
    this.updateQueryParams({
      ['printOnDemand']: this.cryptFilter.printOnDemand ? 'true' : undefined,
      ['clans']:
        this.cryptFilter.clans && this.cryptFilter.clans.length > 0
          ? this.cryptFilter.clans.join(',')
          : undefined,
      ['notClans']:
        this.cryptFilter.notClans && this.cryptFilter.notClans.length > 0
          ? this.cryptFilter.notClans.join(',')
          : undefined,
      ['disciplines']:
        this.cryptFilter.disciplines && this.cryptFilter.disciplines.length > 0
          ? this.cryptFilter.disciplines.join(',')
          : undefined,
      ['superiorDisciplines']:
        this.cryptFilter.superiorDisciplines &&
        this.cryptFilter.superiorDisciplines.length > 0
          ? this.cryptFilter.superiorDisciplines.join(',')
          : undefined,
      ['notDisciplines']:
        this.cryptFilter.notDisciplines &&
        this.cryptFilter.notDisciplines.length > 0
          ? this.cryptFilter.notDisciplines.join(',')
          : undefined,
      ['disciplineMode']:
        this.cryptFilter.disciplineMode === 'or' ? 'or' : undefined,
      ['group']:
        isDefaultGroup || !Array.isArray(this.cryptFilter.groupSlider)
          ? undefined
          : this.cryptFilter.groupSlider.join(','),
      ['capacity']:
        isDefaultCapacity || !Array.isArray(this.cryptFilter.capacitySlider)
          ? undefined
          : this.cryptFilter.capacitySlider.join(','),
      ['advanced']: this.cryptFilter.advanced || undefined,
      ['title']: this.cryptFilter.title || undefined,
      ['set']: this.cryptFilter.set || undefined,
      ['sect']: this.cryptFilter.sect || undefined,
      ['paths']:
        this.cryptFilter.paths && this.cryptFilter.paths.length > 0
          ? this.cryptFilter.paths.join(',')
          : undefined,
      ['notPaths']:
        this.cryptFilter.notPaths && this.cryptFilter.notPaths.length > 0
          ? this.cryptFilter.notPaths.join(',')
          : undefined,
      ['taints']:
        this.cryptFilter.taints && this.cryptFilter.taints.length > 0
          ? this.cryptFilter.taints.join(',')
          : undefined,
      ['cardText']: this.cryptFilter.cardText || undefined,
      ['artist']: this.cryptFilter.artist || undefined,
      ['predefinedLimitedFormat']:
        this.cryptFilter.predefinedLimitedFormat || undefined,
    })
    this.updateFilterChips()
    this.initQuery()
  }

  initQuery(firstInitialize = false) {
    this.limitTo = CryptSectionComponent.PAGE_SIZE
    this.updateQuery()
    if (!firstInitialize && !this.mediaService.isMobileOrTablet()) {
      this.scrollToTop()
    }
  }

  private updateQuery() {
    this.crypt$ = this.cryptQuery
      .selectAll({
        filter: this.cryptFilter,
        sortBy: this.sortByTrigramSimilarity
          ? 'trigramSimilarity'
          : this.sortBy,
        sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      })
      .pipe(
        tap((results) => this.resultsCount$.next(results.length)),
        switchMap((results) => {
          const sliced = results.slice(0, this.limitTo)
          this.hasMore$.next(sliced.length < results.length)
          return of(sliced)
        }),
      )
    this.changeDetector.markForCheck()
  }

  getCard(card: ApiCrypt): ApiCard {
    return {
      id: card.id,
    } as ApiCard
  }

  openCryptCard(card: ApiCrypt): void {
    const modalRef = this.modalService.open(CryptCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const cryptList = this.cryptQuery.getAll({
      filter: this.cryptFilter,
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
    })
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = cryptList.indexOf(card)
  }

  openCameraScanner(): void {
    const modalRef = this.modalService.open(CameraScannerComponent, {
      size: 'lg',
      centered: true,
      modalDialogClass: 'modal-camera-scanner',
    })
    modalRef.componentInstance.idOnly.set(true)
  }

  trackByFn(_: number, item: ApiCrypt) {
    return item.id
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
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
