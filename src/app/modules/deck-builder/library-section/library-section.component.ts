import { LibraryCardComponent } from './../../deck-shared/library-card/library-card.component'
import { LibraryService } from './../../../state/library/library.service'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
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
import { FormControl } from '@angular/forms'
import { ApiLibrary } from '../../../models/api-library'
import { Order, SelectOptions, SortBy } from '@datorama/akita'
import { LibraryQuery } from '../../../state/library/library.query'
import { MediaService } from '../../../services/media.service'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { searchIncludes } from '../../../utils/vtes-utils'
import { ApiCard } from '../../../models/api-card'
import { DOCUMENT, ViewportScroller } from '@angular/common'

@UntilDestroy()
@Component({
  selector: 'app-library-section',
  templateUrl: './library-section.component.html',
  styleUrls: ['./library-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibrarySectionComponent implements OnInit {
  private static readonly PAGE_SIZE = 40
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = LibrarySectionComponent.PAGE_SIZE
  sortBy: SortBy<ApiLibrary> = 'name'
  sortByOrder: Order = Order.ASC
  printOnDemand: boolean = false
  types: string[] = []
  clans: string[] = []
  disciplines: string[] = []
  sect!: string
  bloodCostSlider: number[] = [0, 4]
  poolCostSlider: number[] = [0, 6]
  title!: string
  taints: string[] = []

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private viewportService: ViewportScroller,
    private changeDetector: ChangeDetectorRef,
    private libraryService: LibraryService,
    private libraryQuery: LibraryQuery,
    private mediaService: MediaService,
    private modalService: NgbModal,
  ) {}

  ngOnInit() {
    this.isMobile$ = this.mediaService.observeMobile()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.listenScroll()
    this.initFilters()
  }

  openModal(content: TemplateRef<any>) {
    this.modalService.open(content)
  }

  onScroll() {
    this.limitTo += LibrarySectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  initFilters() {
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.printOnDemand = false
    this.types = []
    this.disciplines = []
    this.clans = []
    this.title = ''
    this.sect = ''
    this.bloodCostSlider = [0, 4]
    this.poolCostSlider = [0, 6]
    this.taints = []
    this.sortBy = 'name'
    this.sortByOrder = Order.ASC
    this.onChangeNameFilter()
    this.initQuery()
  }

  onChangeSortBy(sortBy: SortBy<ApiLibrary>, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (this.sortBy === sortBy) {
      this.sortByOrder = this.sortByOrder === Order.ASC ? Order.DESC : Order.ASC
    } else if (sortBy === 'deckPopularity' || sortBy === 'cardPopularity') {
      this.sortByOrder = Order.DESC
    } else {
      this.sortByOrder = Order.ASC
    }
    this.sortBy = sortBy
    this.initQuery()
  }

  onChangeNameFilter() {
    this.nameFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap(() => this.initQuery()),
      )
      .subscribe()
  }

  onChangePrintOnDemand(printOnDemand: boolean) {
    this.printOnDemand = printOnDemand
    this.initQuery()
  }

  onChangeTypesFilter(types: string[]) {
    this.types = types
    this.initQuery()
  }

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.initQuery()
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.initQuery()
  }

  onChangeSectFilter(sect: string) {
    this.sect = sect
    this.initQuery()
  }

  onChangeTitleFilter(title: string) {
    this.title = title
    this.initQuery()
  }

  onChangeBloodCostSliderFilter(bloodCostSlider: number[]) {
    this.bloodCostSlider = bloodCostSlider
    this.initQuery()
  }

  onChangePoolCostSliderFilter(poolCostSlider: number[]) {
    this.poolCostSlider = poolCostSlider
    this.initQuery()
  }

  onChangeTaintsFilter(taints: string[]) {
    this.taints = taints
    this.initQuery()
  }

  initQuery() {
    this.limitTo = LibrarySectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  private filterBy: SelectOptions<ApiLibrary>['filterBy'] = (entity) => {
    const name = this.nameFormControl.value
    if (name && !searchIncludes(entity.name, name)) {
      return false
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
        if (clan === 'none' && entity.clans.length === 0) {
          clanMatch = true
        } else if (entity.clans.includes(clan)) {
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
    if (this.title) {
      if (this.title === 'none') {
        return entity.titles.length === 0
      } else if (!entity.titles.includes(this.title)) {
        return false
      }
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
    return true
  }

  private updateQuery() {
    this.library$ = this.libraryQuery
      .selectAll({
        filterBy: this.filterBy,
        sortBy: this.sortBy,
        sortByOrder: this.sortByOrder,
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
      sortBy: this.sortBy,
      sortByOrder: this.sortByOrder,
    })
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = libraryList.indexOf(card)
  }

  scrollToTop() {
    this.document
      .querySelector('#container')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  private listenScroll() {
    this.showScrollButton$ = fromEvent(this.document, 'scroll').pipe(
      untilDestroyed(this),
      map(() => this.viewportService.getScrollPosition()?.[1] > 100),
    )
  }
}
