import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
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
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { debounceTime, Observable, tap } from 'rxjs'
import { LibraryQuery } from '../../../state/library/library.query'
import { LibraryComponent } from '../../deck-shared/library/library.component'
import { LibraryBuilderFilterComponent } from '../library-builder-filter/library-builder-filter.component'
import { ApiCard } from './../../../models/api-card'
import { ApiLibrary, LibrarySortBy } from './../../../models/api-library'
import { MediaService } from './../../../services/media.service'
import { DeckBuilderQuery } from './../../../state/deck-builder/deck-builder.query'
import { DeckBuilderService } from './../../../state/deck-builder/deck-builder.service'
import { searchIncludes } from './../../../utils/vtes-utils'

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
    TranslocoPipe
],
})
export class LibraryBuilderComponent implements OnInit {
  private static readonly PAGE_SIZE = 20
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  librarySize$!: Observable<number>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>

  private limitTo = LibraryBuilderComponent.PAGE_SIZE
  sortBy!: LibrarySortBy
  sortByOrder!: 'asc' | 'desc'
  limitedFormat?: boolean
  types!: string[]
  clans!: string[]
  disciplines!: string[]
  sect!: string
  bloodCostSlider!: number[]
  poolCostSlider!: number[]
  title!: string
  taints!: string[]

  constructor(
    public modal: NgbActiveModal,
    private readonly libraryQuery: LibraryQuery,
    private readonly deckBuilderQuery: DeckBuilderQuery,
    private readonly deckBuilderService: DeckBuilderService,
    private readonly mediaService: MediaService,
    private readonly modalService: NgbModal,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.librarySize$ = this.deckBuilderQuery.selectLibrarySize()
    this.isMobile$ = this.mediaService.observeMobile()
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.initFilters()
    this.onChangeNameFilter()
  }

  openModal(content: TemplateRef<any>) {
    this.modalService.open(content)
  }

  onScroll() {
    this.limitTo += LibraryBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  initFilters() {
    if (this.deckBuilderQuery.getLimitedFormat() !== undefined) {
      this.limitedFormat = true
    }
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.types = []
    this.disciplines = []
    this.clans = []
    this.title = ''
    this.sect = ''
    this.bloodCostSlider = [0, 4]
    this.poolCostSlider = [0, 6]
    this.taints = []
    this.sortBy = 'relevance'
    this.sortByOrder = 'desc'
    this.initQuery()
  }

  onChangeLimitedFormat(limitedFormat: boolean) {
    this.limitedFormat = limitedFormat
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
      sortBy === 'cardPopularity'
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
        tap(() => this.initQuery()),
      )
      .subscribe()
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
    this.limitTo = LibraryBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  private updateQuery() {
    this.library$ = this.libraryQuery.selectAll({
      limitTo: this.limitTo,
      filterBy: (entity) => {
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
        if (this.types.length > 0) {
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
        if (this.clans.length > 0) {
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
        for (const discipline of this.disciplines) {
          if (discipline === 'none' && entity.disciplines.length === 0) {
            continue
          } else if (!entity.disciplines.includes(discipline)) {
            return false
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
        if (
          poolCost != -1 &&
          (poolCost < poolCostMin || poolCost > poolCostMax)
        ) {
          return false
        }
        for (const taint of this.taints) {
          if (!entity.taints.includes(taint)) {
            return false
          }
        }
        const limitedFormatState = this.deckBuilderQuery.getLimitedFormat()
        if (this.limitedFormat && limitedFormatState) {
          if (limitedFormatState.banned.crypt[entity.id]) {
            return false
          }
          if (limitedFormatState.banned.library[entity.id]) {
            return false
          }
          if (limitedFormatState.allowed.crypt[entity.id]) {
            return true
          }
          if (limitedFormatState.allowed.library[entity.id]) {
            return true
          }
          if (
            !Object.keys(limitedFormatState.sets).some((set) =>
              entity.sets.some((entitySet) => entitySet.split(':')[0] === set),
            )
          ) {
            return false
          }
        }
        return true
      },
      sortBy: this.sortBy,
      sortByOrder: this.sortByOrder,
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
    return {
      id: card.id,
      number: this.deckBuilderQuery.getCardNumber(card.id),
    } as ApiCard
  }

  addCard(id: number) {
    this.deckBuilderService.addCard(id)
  }

  removeCard(id: number) {
    this.deckBuilderService.removeCard(id)
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
}
