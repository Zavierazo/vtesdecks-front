import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  inject,
  output,
} from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { ClanFilterComponent } from '@deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '@deck-shared/discipline-filter/discipline-filter.component'
import { PathFilterComponent } from '@deck-shared/path-filter/path-filter.component'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { CryptFilter } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import {
  SegmentedFilterComponent,
  SegmentedFilterOption,
} from '@shared/components/segmented-filter/segmented-filter.component'
import {
  MultiSelectComponent,
  MultiSelectOption,
  MultiSelectSelection,
} from '@shared/components/multi-select/multi-select.component'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CARD_SHOPS, CRYPT_VOTES_RANGE } from '@utils'
import { tap } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-crypt-builder-filter',
  templateUrl: './crypt-builder-filter.component.html',
  styleUrls: ['./crypt-builder-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    ClanFilterComponent,
    DisciplineFilterComponent,
    PathFilterComponent,
    NgxSliderModule,
    AsyncPipe,
    TitleCasePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    DatePipe,
    SegmentedFilterComponent,
    MultiSelectComponent,
  ],
})
export class CryptBuilderFilterComponent implements OnInit, OnChanges {
  private cryptQuery = inject(CryptQuery)
  private apiDataService = inject(ApiDataService)

  @Input() filter!: CryptFilter
  @Input() showSet = true
  readonly filterChange = output<CryptFilter>()

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  predefinedLimitedFormatControl!: FormControl
  groupSliderControl!: FormControl
  capacitySliderControl!: FormControl
  votesSliderControl!: FormControl
  titleControl!: FormControl
  sectControl!: FormControl
  setControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl
  artistControl!: FormControl

  titles$ = this.cryptQuery.selectTitles()
  sects$ = this.cryptQuery.selectSects()
  taints$ = this.cryptQuery.selectTaints()
  sets$ = this.cryptQuery.selectSets()
  predefinedLimitedFormats$ = this.apiDataService.getLimitedFormats()
  readonly shopOptions: readonly MultiSelectOption[] = CARD_SHOPS.map(
    (shop) => ({
      value: shop.name,
      label: shop.fullName,
      shortLabel: shop.name,
    }),
  )
  maxCapacity = this.cryptQuery.getMaxCapacity()
  maxGroup = this.cryptQuery.getMaxGroup()
  readonly minVotes = CRYPT_VOTES_RANGE[0]
  readonly maxVotes = CRYPT_VOTES_RANGE[1]
  initialized = false

  readonly advancedOptions: SegmentedFilterOption[] = [
    { value: undefined, labelKey: 'crypt_builder_filter.advanced_any' },
    { value: 'base', labelKey: 'crypt_builder_filter.advanced_base' },
    { value: 'advanced', labelKey: 'crypt_builder_filter.advanced_advanced' },
  ]

  /** Legal group pairs, trimmed to the groups actually printed. */
  get groupPairs(): number[][] {
    return [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ].filter(([, max]) => max <= this.maxGroup)
  }

  get capacityShortcuts(): { labelKey: string; range: number[] }[] {
    return [
      { labelKey: 'capacity_weenie', range: [1, 4] },
      { labelKey: 'capacity_mid_cap', range: [5, 7] },
      { labelKey: 'capacity_high_cap', range: [8, this.maxCapacity] },
    ]
  }

  ngOnInit() {
    this.initFormControls()
    this.initialized = true
  }

  ngOnChanges() {
    if (!this.initialized) {
      return
    }
    this.initFormControls()
  }

  initFormControls() {
    this.onChangePrintOnDemand()
    this.onChangeLimitedFormat()
    this.onChangeGroupSlider()
    this.onChangeCapacitySlider()
    this.onChangeVotesSlider()
    this.onChangeTitle()
    this.onChangeSet()
    this.onChangeSect()
    this.onChangeTaint()
    this.onChangeCardText()
    this.onChangePredefinedLimitedFormat()
    this.onChangeArtist()
  }

  onChangeClanFilter(clans: string[]) {
    this.filter.clans = clans
    this.filterChange.emit(this.filter)
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.filter.disciplines = disciplines
    this.filterChange.emit(this.filter)
  }

  onChangeSuperiorDisciplineFilter(superiorDisciplines: string[]) {
    this.filter.superiorDisciplines = superiorDisciplines
    this.filterChange.emit(this.filter)
  }

  onChangeNotClanFilter(notClans: string[]) {
    this.filter.notClans = notClans
    this.filterChange.emit(this.filter)
  }

  onChangeNotDisciplineFilter(notDisciplines: string[]) {
    this.filter.notDisciplines = notDisciplines
    this.filterChange.emit(this.filter)
  }

  onChangePathFilter(paths: string[]) {
    this.filter.paths = paths
    this.filterChange.emit(this.filter)
  }

  onChangeNotPathFilter(notPaths: string[]) {
    this.filter.notPaths = notPaths
    this.filterChange.emit(this.filter)
  }

  onChangeDisciplineMode(disciplineMode: 'and' | 'or') {
    this.filter.disciplineMode = disciplineMode
    this.filterChange.emit(this.filter)
  }

  onChangePrintOnDemand() {
    this.printOnDemandControl = new FormControl(this.filter.printOnDemand)
    this.printOnDemandControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.printOnDemand = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeShopAvailability(selection: MultiSelectSelection) {
    this.filter.shops = selection.selected
    this.filter.notShops = selection.excluded
    this.filterChange.emit(this.filter)
  }

  onChangeLimitedFormat() {
    this.limitedFormatControl = new FormControl(this.filter.limitedFormat)
    this.limitedFormatControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.limitedFormat = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangePredefinedLimitedFormat() {
    this.predefinedLimitedFormatControl = new FormControl(
      this.filter.predefinedLimitedFormat,
    )
    this.predefinedLimitedFormatControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.predefinedLimitedFormat = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeGroupSlider() {
    this.groupSliderControl = new FormControl(this.filter.groupSlider)
    this.groupSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.groupSlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeAdvanced(advanced?: string) {
    this.filter.advanced = advanced as 'base' | 'advanced' | undefined
    this.filterChange.emit(this.filter)
  }

  get fullGroupRange(): number[] {
    return [1, this.maxGroup]
  }

  get fullCapacityRange(): number[] {
    return [1, this.maxCapacity]
  }

  isActiveGroup(range: number[]): boolean {
    return this.isActiveRange(this.filter.groupSlider, range)
  }

  isActiveCapacity(range: number[]): boolean {
    return this.isActiveRange(this.filter.capacitySlider, range)
  }

  /** Applies a shortcut range, or restores the full range when re-selected. */
  toggleGroupRange(range: number[]) {
    this.groupSliderControl.patchValue(
      this.isActiveGroup(range) ? [1, this.maxGroup] : [...range],
    )
  }

  toggleCapacityRange(range: number[]) {
    this.capacitySliderControl.patchValue(
      this.isActiveCapacity(range) ? [1, this.maxCapacity] : [...range],
    )
  }

  private isActiveRange(current: number[] | undefined, range: number[]) {
    return (
      Array.isArray(current) &&
      current[0] === range[0] &&
      current[1] === range[1]
    )
  }

  onChangeCapacitySlider() {
    this.capacitySliderControl = new FormControl(this.filter.capacitySlider)
    this.capacitySliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.capacitySlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeVotesSlider() {
    this.votesSliderControl = new FormControl(this.filter.votesSlider)
    this.votesSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.votesSlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeTitle() {
    this.titleControl = new FormControl(this.filter.title)
    this.titleControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.title = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeSet() {
    this.setControl = new FormControl(this.filter.set)
    this.setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.set = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeSect() {
    this.sectControl = new FormControl(this.filter.sect)
    this.sectControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.sect = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeTaint() {
    if (!this.taintGroup) {
      this.taintGroup = new FormGroup({})
    }
    if (!this.taints$) {
      return
    }
    this.taints$
      .pipe(
        untilDestroyed(this),
        tap((taints) => {
          taints.forEach((taint) => {
            if (!this.taintGroup.contains(taint)) {
              this.taintGroup.addControl(
                taint,
                new FormControl(this.filter.taints?.includes(taint)),
              )
              this.taintGroup
                .get(taint)
                ?.valueChanges.pipe(
                  untilDestroyed(this),
                  tap((value) => {
                    const newTaints =
                      this.filter.taints?.filter((t) => t !== taint) ?? []
                    if (value) {
                      newTaints.push(taint)
                    }
                    this.filter.taints = newTaints
                    this.filterChange.emit(this.filter)
                  }),
                )
                .subscribe()
            } else {
              this.taintGroup
                .get(taint)
                ?.patchValue(this.filter.taints?.includes(taint), {
                  emitEvent: false,
                })
            }
          })
        }),
      )
      .subscribe()
  }

  onChangeCardText() {
    this.cardTextControl = new FormControl(this.filter.cardText)
    this.cardTextControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.cardText = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeArtist() {
    this.artistControl = new FormControl(this.filter.artist)
    this.artistControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.artist = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }
}
