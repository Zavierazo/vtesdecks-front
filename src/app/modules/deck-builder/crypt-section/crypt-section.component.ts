import {
  AsyncPipe,
  DOCUMENT,
  NgClass,
  NgTemplateOutlet,
  ViewportScroller,
} from '@angular/common'
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
import { ApiCard } from '../../../models/api-card'
import { ApiCrypt } from '../../../models/api-crypt'
import { MediaService } from '../../../services/media.service'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { searchIncludes } from '../../../utils/vtes-utils'
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
  ],
})
export class CryptSectionComponent implements OnInit {
  private readonly document = inject<Document>(DOCUMENT)
  private readonly viewportService = inject(ViewportScroller)
  private readonly changeDetector = inject(ChangeDetectorRef)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)

  private static readonly PAGE_SIZE = 40
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>
  showScrollButton$!: Observable<boolean>
  resultsCount$ = new BehaviorSubject<number>(0)

  private limitTo = CryptSectionComponent.PAGE_SIZE
  sortBy: keyof ApiCrypt = 'name'
  sortByOrder: 'asc' | 'desc' = 'asc'
  printOnDemand = false
  clans: string[] = []
  disciplines: string[] = []
  superiorDisciplines: string[] = []
  groupSlider: number[] = [1, this.cryptQuery.getMaxGroup()]
  capacitySlider: number[] = [1, this.cryptQuery.getMaxCapacity()]
  title!: string
  sect!: string
  taints: string[] = []
  cardText!: string

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
    this.limitTo += CryptSectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  initFilters() {
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.printOnDemand = false
    this.clans = []
    this.disciplines = []
    this.superiorDisciplines = []
    this.groupSlider = [1, this.cryptQuery.getMaxGroup()]
    this.capacitySlider = [1, this.cryptQuery.getMaxCapacity()]
    this.taints = []
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
    this.cardText = ''
    this.onChangeNameFilter()
    this.initQuery()
  }

  onChangeSortBy(sortBy: keyof ApiCrypt, event: MouseEvent) {
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
  }

  onChangeNameFilter() {
    this.nameFormControl.valueChanges
      .pipe(
        untilDestroyed(this),
        debounceTime(500),
        tap(() => {
          this.initQuery()
          this.scrollToTop()
        }),
      )
      .subscribe()
  }

  onChangePrintOnDemand(printOnDemand: boolean) {
    this.printOnDemand = printOnDemand
    this.initQuery()
    this.scrollToTop()
  }

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.initQuery()
    this.scrollToTop()
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.initQuery()
    this.scrollToTop()
  }

  onChangeSuperiorDisciplineFilter(superiorDisciplines: string[]) {
    this.superiorDisciplines = superiorDisciplines
    this.initQuery()
    this.scrollToTop()
  }

  onChangeGroupSliderFilter(groupSlider: number[]) {
    this.groupSlider = groupSlider
    this.initQuery()
    this.scrollToTop()
  }

  onChangeCapacitySliderFilter(capacitySlider: number[]) {
    this.capacitySlider = capacitySlider
    this.initQuery()
    this.scrollToTop()
  }

  onChangeTitleFilter(title: string) {
    this.title = title
    this.initQuery()
    this.scrollToTop()
  }

  onChangeSectFilter(sect: string) {
    this.sect = sect
    this.initQuery()
    this.scrollToTop()
  }

  onChangeTaintsFilter(taints: string[]) {
    this.taints = taints
    this.initQuery()
    this.scrollToTop()
  }

  onChangeCardTextFilter(cardText: string) {
    this.cardText = cardText
    this.initQuery()
    this.scrollToTop()
  }

  initQuery() {
    this.limitTo = CryptSectionComponent.PAGE_SIZE
    this.updateQuery()
  }

  private readonly filterBy: (entity: ApiCrypt, index?: number) => boolean = (
    entity,
  ) => {
    const name = this.nameFormControl.value
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
    this.crypt$ = this.cryptQuery
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
      sortBy: this.sortBy,
      sortByOrder: this.sortByOrder,
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
