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
import { ApiCard, ApiCrypt, CryptSortBy } from '@models'
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
import { CryptQuery } from '@state/crypt/crypt.query'
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
import { CryptGridCardComponent } from '../../deck-shared/crypt-grid-card/crypt-grid-card.component'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { CryptBuilderFilterComponent } from '../crypt-builder-filter/crypt-builder-filter.component'
import { CryptCardComponent } from './../../deck-shared/crypt-card/crypt-card.component'

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
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    NgTemplateOutlet,
    InfiniteScrollDirective,
    CryptComponent,
    NgbTooltip,
    CryptBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
    ToggleIconComponent,
    CryptGridCardComponent,
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
  private router = inject(Router)

  private static readonly PAGE_SIZE = 40
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = CryptSectionComponent.PAGE_SIZE
  sortBy: CryptSortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  printOnDemand = false
  clans: string[] = []
  disciplines: string[] = []
  superiorDisciplines: string[] = []
  groupSlider: number[] = [1, this.cryptQuery.getMaxGroup()]
  capacitySlider: number[] = [1, this.cryptQuery.getMaxCapacity()]
  title!: string
  sect!: string
  path!: string
  set!: string
  taints: string[] = []
  cardText!: string
  artist!: string
  predefinedLimitedFormat?: string

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
    if (queryParams['clans']) {
      this.clans = queryParams['clans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['superiorDisciplines']) {
      this.superiorDisciplines = queryParams['superiorDisciplines'].split(',')
    }
    if (queryParams['group']) {
      this.groupSlider = queryParams['group'].split(',').map((v: string) => +v)
    }
    if (queryParams['capacity']) {
      this.capacitySlider = queryParams['capacity']
        .split(',')
        .map((v: string) => +v)
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
    if (queryParams['artist']) {
      this.artist = queryParams['artist']
    }
    if (queryParams['cardId'] && Object.keys(queryParams).length === 1) {
      setTimeout(() => {
        const card = this.cryptQuery.getEntity(Number(queryParams['cardId']))
        if (card) {
          this.openCryptCard(card)
        }
      }, 1000)
    }
    if (queryParams['predefinedLimitedFormat']) {
      this.predefinedLimitedFormat = queryParams['predefinedLimitedFormat']
    }
    this.onChangeNameFilter()
    this.initQuery()
  }

  private initDefaults() {
    this.nameFormControl.patchValue('', {
      emitEvent: false,
    })
    this.printOnDemand = false
    this.set = ''
    this.title = ''
    this.sect = ''
    this.path = ''
    this.clans = []
    this.disciplines = []
    this.superiorDisciplines = []
    this.groupSlider = [1, this.cryptQuery.getMaxGroup()]
    this.capacitySlider = [1, this.cryptQuery.getMaxCapacity()]
    this.taints = []
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
    this.cardText = ''
    this.artist = ''
  }

  onChangeSortBy(sortBy: keyof ApiCrypt, event: MouseEvent) {
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
    this.onChangeDisciplines()
  }

  onChangeSuperiorDisciplineFilter(superiorDisciplines: string[]) {
    this.superiorDisciplines = superiorDisciplines
    this.initQuery()
    this.scrollToTop()
    this.onChangeDisciplines()
  }

  private onChangeDisciplines() {
    this.updateQueryParams({
      ['disciplines']:
        this.disciplines.length > 0 ? this.disciplines.join(',') : undefined,
      ['superiorDisciplines']:
        this.superiorDisciplines.length > 0
          ? this.superiorDisciplines.join(',')
          : undefined,
    })
  }

  onChangeGroupSliderFilter(groupSlider: number[]) {
    this.groupSlider = groupSlider
    this.initQuery()
    this.scrollToTop()
    const isDefault =
      Array.isArray(groupSlider) &&
      groupSlider[0] === 1 &&
      groupSlider[1] === this.cryptQuery.getMaxGroup()
    this.updateQueryParams({
      ['group']:
        isDefault || !Array.isArray(groupSlider)
          ? undefined
          : this.groupSlider.join(','),
    })
  }

  onChangeCapacitySliderFilter(capacitySlider: number[]) {
    this.capacitySlider = capacitySlider
    this.initQuery()
    this.scrollToTop()
    const isDefault =
      Array.isArray(capacitySlider) &&
      capacitySlider[0] === 1 &&
      capacitySlider[1] === this.cryptQuery.getMaxCapacity()
    this.updateQueryParams({
      ['capacity']:
        isDefault || !Array.isArray(capacitySlider)
          ? undefined
          : this.capacitySlider.join(','),
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

  onChangeArtistFilter(artist: string) {
    this.artist = artist
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['artist']: this.artist || undefined,
    })
  }

  onChangePredefinedLimitedFormatFilter(predefinedLimitedFormat: string) {
    this.predefinedLimitedFormat = predefinedLimitedFormat
    this.initQuery()
    this.scrollToTop()
    this.updateQueryParams({
      ['predefinedLimitedFormat']: this.predefinedLimitedFormat || undefined,
    })
  }

  initQuery() {
    this.limitTo = CryptSectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  private readonly filterBy: (entity: ApiCrypt, index?: number) => boolean = (
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
    if (this.clans?.length > 0 && !this.clans?.includes(entity.clan)) {
      return false
    }
    for (const discipline of this.disciplines) {
      if (!entity.disciplines.includes(discipline)) {
        return false
      }
    }
    for (const superiorDiscipline of this.superiorDisciplines) {
      if (!entity.superiorDisciplines.includes(superiorDiscipline)) {
        return false
      }
    }
    const groupMin = this.groupSlider[0]
    const groupMax = this.groupSlider[1]
    const group = entity.group
    if (group > 0 && (group < groupMin || group > groupMax)) {
      return false
    }
    const capacityMin = this.capacitySlider[0]
    const capacityMax = this.capacitySlider[1]
    if (entity.capacity < capacityMin || entity.capacity > capacityMax) {
      return false
    }
    if (this.title && entity.title !== this.title) {
      return false
    }
    if (this.sect && entity.sect !== this.sect) {
      return false
    }
    if (this.path && entity.path !== this.path) {
      return false
    }
    if (this.set) {
      return entity.sets.some((set) => set.startsWith(this.set + ':'))
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
    if (this.predefinedLimitedFormat) {
      if (
        !entity.limitedFormats?.includes(Number(this.predefinedLimitedFormat))
      ) {
        return false
      }
    }
    if (this.artist) {
      if (!searchIncludes(entity.artist, this.artist)) {
        return false
      }
    }
    return true
  }

  private updateQuery() {
    this.crypt$ = this.cryptQuery
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
      filterBy: this.filterBy,
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
      nameFilter: this.nameFilter,
    })
    modalRef.componentInstance.cardList = cryptList
    modalRef.componentInstance.index = cryptList.indexOf(card)
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
