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
import { ApiCard, ApiCrypt, CryptFilter, CryptSortBy } from '@models'
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
  private location = inject(Location)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = CryptSectionComponent.PAGE_SIZE
  sortBy: CryptSortBy = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  cryptFilter = this.cryptQuery.getDefaultCryptFilter()
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
    if (queryParams['path']) {
      this.cryptFilter.path = queryParams['path']
    }
    if (queryParams['clans']) {
      this.cryptFilter.clans = queryParams['clans'].split(',')
    }
    if (queryParams['disciplines']) {
      this.cryptFilter.disciplines = queryParams['disciplines'].split(',')
    }
    if (queryParams['superiorDisciplines']) {
      this.cryptFilter.superiorDisciplines =
        queryParams['superiorDisciplines'].split(',')
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
    if (queryParams['taints']) {
      this.cryptFilter.taints = queryParams['taints'].split(',')
    }
    if (queryParams['sortBy']) {
      this.sortBy = queryParams['sortBy']
    }
    if (queryParams['sortByOrder']) {
      this.sortByOrder = queryParams['sortByOrder']
    }
    if (queryParams['cardText']) {
      this.cryptFilter.cardText = queryParams['cardText']
    }
    if (queryParams['artist']) {
      this.cryptFilter.artist = queryParams['artist']
    }
    this.route.queryParams.subscribe((param) => {
      // Used when coming from card info artist link
      if (param['artist']) {
        this.onChangeCryptFilter({
          ...this.cryptFilter,
          artist: param['artist'],
        })
      }
    })
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
    this.onChangeNameFilter()
    this.initQuery(true)
  }

  private initDefaults() {
    this.cryptFilter = this.cryptQuery.getDefaultCryptFilter()
    this.nameFormControl.patchValue(this.cryptFilter.name ?? '', {
      emitEvent: false,
    })
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
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
          this.cryptFilter.name = this.nameFilter || ''
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
      ['disciplines']:
        this.cryptFilter.disciplines && this.cryptFilter.disciplines.length > 0
          ? this.cryptFilter.disciplines.join(',')
          : undefined,
      ['superiorDisciplines']:
        this.cryptFilter.superiorDisciplines &&
        this.cryptFilter.superiorDisciplines.length > 0
          ? this.cryptFilter.superiorDisciplines.join(',')
          : undefined,
      ['group']:
        isDefaultGroup || !Array.isArray(this.cryptFilter.groupSlider)
          ? undefined
          : this.cryptFilter.groupSlider.join(','),
      ['capacity']:
        isDefaultCapacity || !Array.isArray(this.cryptFilter.capacitySlider)
          ? undefined
          : this.cryptFilter.capacitySlider.join(','),
      ['title']: this.cryptFilter.title || undefined,
      ['set']: this.cryptFilter.set || undefined,
      ['sect']: this.cryptFilter.sect || undefined,
      ['path']: this.cryptFilter.path || undefined,
      ['taints']:
        this.cryptFilter.taints && this.cryptFilter.taints.length > 0
          ? this.cryptFilter.taints.join(',')
          : undefined,
      ['cardText']: this.cryptFilter.cardText || undefined,
      ['artist']: this.cryptFilter.artist || undefined,
      ['predefinedLimitedFormat']:
        this.cryptFilter.predefinedLimitedFormat || undefined,
    })
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
      filter: this.cryptFilter,
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
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
