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
import { ActivatedRoute, Router } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiLibrary, LibrarySortBy } from '@models'
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
import { isRegexSearch, searchIncludes } from '@utils'
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

  private static readonly PAGE_SIZE = 40
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = LibrarySectionComponent.PAGE_SIZE
  sortBy: LibrarySortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  printOnDemand = false
  types: string[] = []
  clans: string[] = []
  disciplines: string[] = []
  sect!: string
  path!: string
  bloodCostSlider: number[] = [0, 4]
  poolCostSlider: number[] = [0, 6]
  title!: string
  set!: string
  taints: string[] = []
  cardText!: string

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
    this.isMobile$ = this.mediaService.observeMobile()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.listenScroll()
    this.initFilters()
  }

  private updateQueryParams(params: Record<string, string | undefined>) {
    this.router.navigate([], {
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

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateCardsDisplayMode(displayModeValue)
  }

  openModal(content: TemplateRef<unknown>) {
    this.modalService.open(content)
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
      this.nameFormControl.patchValue(queryParams['name'], {
        emitEvent: false,
      })
    }
    if (queryParams['printOnDemand']) {
      this.printOnDemand = queryParams['printOnDemand'] === 'true'
    }
    if (queryParams['set']) {
      this.set = queryParams['set']
    }
    if (queryParams['title']) {
      this.title = queryParams['title']
    }
    if (queryParams['sect']) {
      this.sect = queryParams['sect']
    }
    if (queryParams['path']) {
      this.path = queryParams['path']
    }
    if (queryParams['types']) {
      this.types = queryParams['types'].split(',')
    }
    if (queryParams['clans']) {
      this.clans = queryParams['clans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['taints']) {
      this.taints = queryParams['taints'].split(',')
    }
    if (queryParams['sortBy']) {
      this.sortBy = queryParams['sortBy']
    }
    if (queryParams['sortByOrder']) {
      this.sortByOrder = queryParams['sortByOrder']
    }
    if (queryParams['cardText']) {
      this.cardText = queryParams['cardText']
    }
    if (queryParams['bloodCostSlider']) {
      this.bloodCostSlider = queryParams['bloodCostSlider']
        .split(',')
        .map((v: string) => +v)
    }
    if (queryParams['poolCostSlider']) {
      this.poolCostSlider = queryParams['poolCostSlider']
        .split(',')
        .map((v: string) => +v)
    }
    if (queryParams['cardId'] && Object.keys(queryParams).length === 1) {
      setTimeout(() => {
        const card = this.libraryQuery.getEntity(Number(queryParams['cardId']))
        if (card) {
          this.openLibraryCard(card)
        }
      }, 1000)
    }
    this.onChangeNameFilter()
    this.initQuery()
  }

  private initDefaults() {
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.printOnDemand = false
    this.types = []
    this.disciplines = []
    this.clans = []
    this.title = ''
    this.sect = ''
    this.path = ''
    this.set = ''
    this.bloodCostSlider = [0, 4]
    this.poolCostSlider = [0, 6]
    this.taints = []
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
    this.cardText = ''
  }

  onChangeSortBy(sortBy: keyof ApiLibrary, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (this.sortBy === sortBy) {
      this.sortByOrder = this.sortByOrder === 'asc' ? 'desc' : 'asc'
    } else if (sortBy === 'deckPopularity' || sortBy === 'cardPopularity') {
      this.sortByOrder = 'desc'
    } else {
      this.sortByOrder = 'asc'
    }
    this.sortBy = sortBy
    this.initQuery()
    this.scrollToTop()
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
          this.scrollToTop()
          this.updateQueryParams({ ['name']: this.nameFilter })
        }),
      )
      .subscribe()
  }

  onChangePrintOnDemand(printOnDemand: boolean) {
    this.printOnDemand = printOnDemand
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['printOnDemand']: this.printOnDemand ? 'true' : undefined,
    })
  }

  onChangeTypesFilter(types: string[]) {
    this.types = types
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['types']: this.types.length > 0 ? this.types.join(',') : undefined,
    })
  }

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['clans']: this.clans.length > 0 ? this.clans.join(',') : undefined,
    })
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['disciplines']:
        this.disciplines.length > 0 ? this.disciplines.join(',') : undefined,
    })
  }

  onChangeSectFilter(sect: string) {
    this.sect = sect
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['sect']: this.sect || undefined,
    })
  }

  onChangePathFilter(path: string) {
    this.path = path
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['path']: this.path || undefined,
    })
  }

  onChangeTitleFilter(title: string) {
    this.title = title
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['title']: this.title || undefined,
    })
  }

  onChangeSetFilter(set: string) {
    this.set = set
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['set']: this.set || undefined,
    })
  }

  onChangeBloodCostSliderFilter(bloodCostSlider: number[]) {
    this.bloodCostSlider = bloodCostSlider
    this.initQuery()
    this.scrollToTop()
    const isDefault = bloodCostSlider[0] === 0 && bloodCostSlider[1] === 4
    this.updateQueryParams({
      ['bloodCostSlider']: isDefault
        ? undefined
        : this.bloodCostSlider.join(','),
    })
  }

  onChangePoolCostSliderFilter(poolCostSlider: number[]) {
    this.poolCostSlider = poolCostSlider
    this.initQuery()
    this.scrollToTop()

    const isDefault = poolCostSlider[0] === 0 && poolCostSlider[1] === 6
    this.updateQueryParams({
      ['poolCostSlider']: isDefault ? undefined : this.poolCostSlider.join(','),
    })
  }

  onChangeTaintsFilter(taints: string[]) {
    this.taints = taints
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['taints']: this.taints.length > 0 ? this.taints.join(',') : undefined,
    })
  }

  onChangeCardTextFilter(cardText: string) {
    this.cardText = cardText
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['cardText']: this.cardText || undefined,
    })
  }

  initQuery() {
    this.limitTo = LibrarySectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  private readonly filterBy: (entity: ApiLibrary, index?: number) => boolean = (
    entity,
  ) => {
    const name = this.nameFilter
    if (name && !searchIncludes(entity.name, name)) {
      if (entity.i18n?.name) {
        return searchIncludes(entity.i18n.name, name)
      } else if (entity.aka) {
        return searchIncludes(entity.aka, name)
      } else {
        return false
      }
    }
    if (this.printOnDemand && !entity.printOnDemand) {
      return false
    }
    if (this.types?.length > 0) {
      let typeMatch = false
      for (const type of this.types) {
        const types = entity.type.split('/')
        if (types.includes(type)) {
          typeMatch = true
        }
      }
      if (!typeMatch) {
        return false
      }
    }
    if (this.clans?.length > 0) {
      let clanMatch = false
      for (const clan of this.clans) {
        if (
          (clan === 'none' && entity.clans.length === 0) ||
          entity.clans.includes(clan)
        ) {
          clanMatch = true
        }
      }
      if (!clanMatch) {
        return false
      }
    }
    if (this.disciplines) {
      for (const discipline of this.disciplines) {
        if (discipline === 'none' && entity.disciplines.length === 0) {
          continue
        } else if (!entity.disciplines.includes(discipline)) {
          return false
        }
      }
    }
    if (this.sect) {
      if (this.sect === 'none') {
        return entity.sects.length === 0
      } else if (!entity.sects.includes(this.sect)) {
        return false
      }
    }
    if (this.path && entity.path !== this.path) {
      return false
    }
    if (this.title) {
      if (this.title === 'none') {
        return entity.titles.length === 0
      } else if (!entity.titles.includes(this.title)) {
        return false
      }
    }
    if (this.set) {
      return entity.sets.some((set) => set.startsWith(this.set + ':'))
    }
    const bloodCostMin = this.bloodCostSlider[0]
    const bloodCostMax = this.bloodCostSlider[1]
    const bloodCost = entity.bloodCost ?? 0
    if (
      bloodCost != -1 &&
      (bloodCost < bloodCostMin || bloodCost > bloodCostMax)
    ) {
      return false
    }
    const poolCostMin = this.poolCostSlider[0]
    const poolCostMax = this.poolCostSlider[1]
    const poolCost = entity.poolCost ?? 0
    if (poolCost != -1 && (poolCost < poolCostMin || poolCost > poolCostMax)) {
      return false
    }
    for (const taint of this.taints) {
      if (!entity.taints.includes(taint)) {
        return false
      }
    }
    if (this.cardText && !searchIncludes(entity.text, this.cardText)) {
      if (entity.i18n?.text) {
        return searchIncludes(entity.i18n.text, this.cardText)
      } else {
        return false
      }
    }
    return true
  }

  private updateQuery() {
    this.library$ = this.libraryQuery
      .selectAll({
        filterBy: this.filterBy,
        sortBy: this.sortByTrigramSimilarity
          ? 'trigramSimilarity'
          : this.sortBy,
        sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
        nameFilter: this.nameFilter,
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
      filterBy: this.filterBy,
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      nameFilter: this.nameFilter,
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
