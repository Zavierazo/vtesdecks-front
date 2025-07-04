import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common'
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
import { searchIncludes } from '../../../utils/vtes-utils'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { CryptBuilderFilterComponent } from '../crypt-builder-filter/crypt-builder-filter.component'
import { ApiCard } from './../../../models/api-card'
import { ApiCrypt, CryptSortBy } from './../../../models/api-crypt'
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
    CryptBuilderFilterComponent,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class CryptBuilderComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly deckBuilderQuery = inject(DeckBuilderQuery)
  private readonly deckBuilderService = inject(DeckBuilderService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private readonly changeDetector = inject(ChangeDetectorRef)

  private static readonly PAGE_SIZE = 20
  nameFormControl = new FormControl('')
  crypt$!: Observable<ApiCrypt[]>
  cryptSize$!: Observable<number>
  isMobile$!: Observable<boolean>
  isMobileOrTablet$!: Observable<boolean>

  private limitTo = CryptBuilderComponent.PAGE_SIZE
  sortBy!: CryptSortBy
  sortByOrder!: 'asc' | 'desc'
  limitedFormat?: boolean
  clans!: string[]
  disciplines!: string[]
  superiorDisciplines!: string[]
  groupSlider!: number[]
  capacitySlider!: number[]
  title!: string
  sect!: string
  set!: string
  taints!: string[]
  cardText!: string

  ngOnInit() {
    this.cryptSize$ = this.deckBuilderQuery.selectCryptSize()
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
    if (this.deckBuilderQuery.getLimitedFormat() !== undefined) {
      this.limitedFormat = true
    }
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
    this.sect = ''
    this.set = ''
    this.taints = []
    this.sortBy = 'relevance'
    this.sortByOrder = 'desc'
    this.cardText = ''
    this.initQuery()
  }

  onChangeLimitedFormat(limitedFormat: boolean) {
    this.limitedFormat = limitedFormat
    this.initQuery()
  }

  onChangeSortBy(sortBy: CryptSortBy, event: MouseEvent) {
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

  onChangeSetFilter(set: string) {
    this.set = set
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

  onChangeCardTextFilter(cardText: string) {
    this.cardText = cardText
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
        if (this.set) {
          if (this.set === 'Promo') {
            return entity.sets.some((set) => set.startsWith('Promo-'))
          } else {
            return entity.sets.some((set) => set.startsWith(this.set + ':'))
          }
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
      crypt: {
        total: this.deckBuilderQuery.getCryptSize(),
        minGroup: this.deckBuilderQuery.getMinGroupCrypt(),
        maxGroup: this.deckBuilderQuery.getMaxGroupCrypt(),
        clans: this.deckBuilderQuery.getCryptClans(),
        disciplines: this.deckBuilderQuery.getCryptDisciplines(),
      },
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
