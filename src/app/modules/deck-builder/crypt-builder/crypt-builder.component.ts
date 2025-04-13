import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
} from '@angular/core'
import { FormControl } from '@angular/forms'
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { debounceTime, Observable, tap } from 'rxjs'
import { searchIncludes } from '../../../utils/vtes-utils'
import { ApiCard } from './../../../models/api-card'
import { ApiCrypt } from './../../../models/api-crypt'
import { MediaService } from './../../../services/media.service'
import { CryptQuery } from './../../../state/crypt/crypt.query'
import { DeckBuilderQuery } from './../../../state/deck-builder/deck-builder.query'
import { DeckBuilderService } from './../../../state/deck-builder/deck-builder.service'

@UntilDestroy()
@Component({
  selector: 'app-crypt-builder',
  templateUrl: './crypt-builder.component.html',
  styleUrls: ['./crypt-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CryptBuilderComponent implements OnInit {
  private static readonly PAGE_SIZE = 20
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>

  private limitTo = CryptBuilderComponent.PAGE_SIZE
  sortBy!: keyof ApiCrypt
  sortByOrder!: 'asc' | 'desc'
  clans!: string[]
  disciplines!: string[]
  superiorDisciplines!: string[]
  groupSlider!: number[]
  capacitySlider!: number[]
  title!: string
  sect!: string
  taints!: string[]

  constructor(
    public modal: NgbActiveModal,
    private readonly cryptQuery: CryptQuery,
    private readonly deckBuilderQuery: DeckBuilderQuery,
    private readonly deckBuilderService: DeckBuilderService,
    private readonly mediaService: MediaService,
    private readonly modalService: NgbModal,
    private readonly changeDetector: ChangeDetectorRef,
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
    this.limitTo += CryptBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  initFilters() {
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.clans = []
    this.disciplines = []
    this.superiorDisciplines = []
    const minGroup = this.deckBuilderQuery.getMinGroupCrypt()
    const maxGroup = this.deckBuilderQuery.getMaxGroupCrypt()
    if (minGroup > maxGroup) {
      this.groupSlider = [maxGroup, minGroup]
    } else if (minGroup < maxGroup) {
      this.groupSlider = [minGroup, maxGroup]
    } else {
      this.groupSlider = [
        Math.max(minGroup - 1, 1),
        Math.min(minGroup + 1, this.cryptQuery.getMaxGroup()),
      ]
    }
    this.capacitySlider = [1, this.cryptQuery.getMaxCapacity()]
    this.title = ''
    this.taints = []
    this.sortBy = 'name'
    this.sortByOrder = 'asc'
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

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.initQuery()
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.initQuery()
  }

  onChangeSuperiorDisciplineFilter(superiorDisciplines: string[]) {
    this.superiorDisciplines = superiorDisciplines
    this.initQuery()
  }

  onChangeGroupSliderFilter(groupSlider: number[]) {
    this.groupSlider = groupSlider
    this.initQuery()
  }

  onChangeCapacitySliderFilter(capacitySlider: number[]) {
    this.capacitySlider = capacitySlider
    this.initQuery()
  }

  onChangeTitleFilter(title: string) {
    this.title = title
    this.initQuery()
  }

  onChangeSectFilter(sect: string) {
    this.sect = sect
    this.initQuery()
  }

  onChangeTaintsFilter(taints: string[]) {
    this.taints = taints
    this.initQuery()
  }

  initQuery() {
    this.limitTo = CryptBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  private updateQuery() {
    this.crypt$ = this.cryptQuery.selectAll({
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
        if (this.clans.length > 0 && !this.clans.includes(entity.clan)) {
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
        return true
      },
      sortBy: this.sortBy,
      sortByOrder: this.sortByOrder,
    })
    this.changeDetector.markForCheck()
  }

  getCard(card: ApiCrypt): ApiCard {
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

  trackByFn(_: number, item: ApiCrypt) {
    return item.id
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }
}
