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
import { ApiCard, ApiCrypt, CryptFilter, CryptSortBy } from '@models'
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
import { MediaService } from '@services'
import { ToggleIconComponent } from '@shared/components/toggle-icon/toggle-icon.component'
import { AuthQuery } from '@state/auth/auth.query'
import { AuthService } from '@state/auth/auth.service'
import { CryptQuery } from '@state/crypt/crypt.query'
import { DeckBuilderQuery } from '@state/deck-builder/deck-builder.query'
import { DeckBuilderService } from '@state/deck-builder/deck-builder.service'
import { isRegexSearch } from '@utils'
import { InfiniteScrollDirective } from 'ngx-infinite-scroll'
import { debounceTime, Observable, tap } from 'rxjs'
import { CryptGridCardComponent } from '../../deck-shared/crypt-grid-card/crypt-grid-card.component'
import { CryptComponent } from '../../deck-shared/crypt/crypt.component'
import { CryptBuilderFilterComponent } from '../crypt-builder-filter/crypt-builder-filter.component'

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
    ToggleIconComponent,
    CryptGridCardComponent,
  ],
})
export class CryptBuilderComponent implements OnInit {
  modal = inject(NgbActiveModal)
  private readonly cryptQuery = inject(CryptQuery)
  private readonly authQuery = inject(AuthQuery)
  private readonly authService = inject(AuthService)
  private readonly deckBuilderQuery = inject(DeckBuilderQuery)
  private readonly deckBuilderService = inject(DeckBuilderService)
  private readonly mediaService = inject(MediaService)
  private readonly modalService = inject(NgbModal)
  private readonly changeDetector = inject(ChangeDetectorRef)

  private static readonly PAGE_SIZE = 50
  nameFormControl = new FormControl(this.deckBuilderQuery.getCryptFilter().name)
  crypt$!: Observable<ApiCrypt[]>
  cryptSize$ = this.deckBuilderQuery.selectCryptSize()
  cryptFilter$ = this.deckBuilderQuery.selectCryptFilter()
  isMobile$ = this.mediaService.observeMobile()
  isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()

  private limitTo = CryptBuilderComponent.PAGE_SIZE
  sortBy!: CryptSortBy
  sortByOrder!: 'asc' | 'desc'

  displayMode$ = this.authQuery.selectBuilderDisplayMode()
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
    this.initFilters()
    this.onChangeNameFilter()
  }

  onChangeDisplayMode(displayMode: string) {
    const displayModeValue = displayMode as 'list' | 'grid'
    this.authService.updateBuilderDisplayMode(displayModeValue)
  }

  get nameFilter(): string | undefined {
    return this.nameFormControl.value || undefined
  }

  get sortByTrigramSimilarity(): boolean {
    const name = this.nameFilter
    return name !== undefined && !isRegexSearch(name) && name.length > 3
  }

  openModal(content: TemplateRef<unknown>) {
    this.modalService.open(content)
  }

  onScroll() {
    this.limitTo += CryptBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  resetFilters() {
    this.deckBuilderService.resetCryptFilter()
    this.nameFormControl.patchValue('', { emitEvent: false })
    this.initFilters()
  }

  private initFilters() {
    if (this.deckBuilderQuery.getLimitedFormat() !== undefined) {
      this.deckBuilderService.updateCryptFilter((filter) => ({
        ...filter,
        limitedFormat: true,
        customLimitedFormat: this.deckBuilderQuery.getLimitedFormat(),
      }))
    } else {
      this.deckBuilderService.updateCryptFilter((filter) => ({
        ...filter,
        limitedFormat: undefined,
        customLimitedFormat: undefined,
      }))
    }

    const minGroup = this.deckBuilderQuery.getMinGroupCrypt()
    const maxGroup = this.deckBuilderQuery.getMaxGroupCrypt()
    if (minGroup > maxGroup) {
      this.deckBuilderService.updateCryptFilter((filter) => ({
        ...filter,
        groupSlider: [maxGroup, minGroup],
      }))
    } else if (minGroup < maxGroup) {
      this.deckBuilderService.updateCryptFilter((filter) => ({
        ...filter,
        groupSlider: [minGroup, maxGroup],
      }))
    } else {
      this.deckBuilderService.updateCryptFilter((filter) => ({
        ...filter,
        groupSlider: [
          Math.max(minGroup - 1, 1),
          Math.min(minGroup + 1, this.cryptQuery.getMaxGroup()),
        ],
      }))
    }
    this.sortBy = 'relevance'
    this.sortByOrder = 'desc'
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
      sortBy === 'cardPopularity' ||
      sortBy === 'minPrice'
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
        tap((value) =>
          this.deckBuilderService.updateCryptFilter((filter) => ({
            ...filter,
            name: value || '',
          })),
        ),
        tap(() => this.initQuery()),
      )
      .subscribe()
  }

  onChangeCryptFilter(filter: CryptFilter) {
    this.deckBuilderService.updateCryptFilter(() => filter)
    this.initQuery()
  }

  initQuery() {
    this.limitTo = CryptBuilderComponent.PAGE_SIZE
    this.updateQuery()
  }

  private updateQuery() {
    this.crypt$ = this.cryptQuery.selectAll({
      limitTo: this.limitTo,
      filter: this.deckBuilderQuery.getCryptFilter(),
      sortBy: this.sortByTrigramSimilarity ? 'trigramSimilarity' : this.sortBy,
      sortByOrder: this.sortByTrigramSimilarity ? 'desc' : this.sortByOrder,
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
    const number = this.deckBuilderQuery.getCardNumber(card.id)
    return {
      id: card.id,
      number,
      collection:
        number > 0
          ? this.deckBuilderQuery.getCardCollection(card.id, number)
          : undefined,
    } as ApiCard
  }

  addCard(id: number) {
    this.deckBuilderService.addCard(id)
  }

  removeCard(id: number) {
    this.deckBuilderService.removeCard(id)
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }
}
