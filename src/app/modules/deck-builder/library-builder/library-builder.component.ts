import { searchIncludes } from './../../../utils/vtes-utils'
import { ApiLibrary } from './../../../models/api-library'
import { MediaService } from './../../../services/media.service'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { FormControl } from '@angular/forms'
import { DeckBuilderService } from './../../../state/deck-builder/deck-builder.service'
import { DeckBuilderQuery } from './../../../state/deck-builder/deck-builder.query'
import { ApiCard } from './../../../models/api-card'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Observable, tap, debounceTime } from 'rxjs'
import { Order, SortBy } from '@datorama/akita'
import { LibraryQuery } from '../../../state/library/library.query'

@UntilDestroy()
@Component({
  selector: 'app-library-builder',
  templateUrl: './library-builder.component.html',
  styleUrls: ['./library-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryBuilderComponent implements OnInit {
  private static readonly PAGE_SIZE = 20
  nameFormControl = new FormControl('')
  library$!: Observable<ApiLibrary[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>

  private limitTo = LibraryBuilderComponent.PAGE_SIZE
  sortBy!: SortBy<ApiLibrary>
  sortByOrder!: Order
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
    private libraryQuery: LibraryQuery,
    private deckBuilderQuery: DeckBuilderQuery,
    private deckBuilderService: DeckBuilderService,
    private mediaService: MediaService,
    private modalService: NgbModal,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit() {
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
    this.nameFormControl.patchValue('', { emitEvent: false })
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
          return false
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
        return true
      },
      sortBy: this.sortBy,
      sortByOrder: this.sortByOrder,
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
