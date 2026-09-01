import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  output,
} from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { ClanFilterComponent } from '@deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '@deck-shared/discipline-filter/discipline-filter.component'
import { PathFilterComponent } from '@deck-shared/path-filter/path-filter.component'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { LibraryFilter } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import {
  SegmentedFilterComponent,
  SegmentedFilterOption,
} from '@shared/components/segmented-filter/segmented-filter.component'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { LibraryQuery } from '@state/library/library.query'
import { CARD_SHOPS } from '@utils'
import { tap } from 'rxjs'
import { LibraryTypeFilterComponent } from '../library-type-filter/library-type-filter.component'

@UntilDestroy()
@Component({
  selector: 'app-library-builder-filter',
  templateUrl: './library-builder-filter.component.html',
  styleUrls: ['./library-builder-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    LibraryTypeFilterComponent,
    DisciplineFilterComponent,
    ClanFilterComponent,
    PathFilterComponent,
    NgxSliderModule,
    AsyncPipe,
    TitleCasePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    DatePipe,
    SegmentedFilterComponent,
  ],
})
export class LibraryBuilderFilterComponent implements OnInit, OnChanges {
  private libraryQuery = inject(LibraryQuery)
  private apiDataService = inject(ApiDataService)

  @Input() filter!: LibraryFilter
  @Input() showSet = true
  readonly filterChange = output<LibraryFilter>()

  printOnDemandControl!: FormControl
  shopControl!: FormControl
  limitedFormatControl!: FormControl
  predefinedLimitedFormatControl!: FormControl
  sectControl!: FormControl
  titleControl!: FormControl
  setControl!: FormControl
  bloodCostSliderControl!: FormControl
  poolCostSliderControl!: FormControl
  convictionCostSliderControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl
  artistControl!: FormControl

  sects$ = this.libraryQuery.selectSects()
  titles$ = this.libraryQuery.selectTitles()
  taints$ = this.libraryQuery.selectTaints()
  sets$ = this.libraryQuery.selectSets()
  predefinedLimitedFormats$ = this.apiDataService.getLimitedFormats()
  readonly shops = CARD_SHOPS
  maxConvictionCost = this.libraryQuery.getMaxConvictionCost()
  initialized = false

  readonly trifleOptions: SegmentedFilterOption[] = [
    { value: undefined, labelKey: 'library_builder_filter.trifle_any' },
    { value: 'trifle', labelKey: 'library_builder_filter.trifle_only' },
    { value: 'non_trifle', labelKey: 'library_builder_filter.trifle_non' },
  ]

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
    this.onChangeShop()
    this.onChangeLimitedFormat()
    this.onChangeSect()
    this.onChangeTitle()
    this.onChangeSet()
    this.onChangeBloodCostSlider()
    this.onChangePoolCostSlider()
    this.onChangeConvictionCostSlider()
    this.onChangeTaint()
    this.onChangeCardText()
    this.onChangePredefinedLimitedFormat()
    this.onChangeArtist()
  }

  /** The trifle filter only makes sense while Master cards are in scope. */
  get masterTypeSelected(): boolean {
    return this.filter.types?.includes('Master') ?? false
  }

  onChangeTypeFilter(types: string[]) {
    this.filter.types = types
    if (!this.masterTypeSelected) {
      this.filter.trifle = undefined
    }
    this.filterChange.emit(this.filter)
  }

  onChangeClanFilter(clans: string[]) {
    this.filter.clans = clans
    this.filterChange.emit(this.filter)
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.filter.disciplines = disciplines
    this.filterChange.emit(this.filter)
  }

  onChangeNotTypeFilter(notTypes: string[]) {
    this.filter.notTypes = notTypes
    this.filterChange.emit(this.filter)
  }

  onChangeTypeMode(typeMode: 'and' | 'or') {
    this.filter.typeMode = typeMode
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

  onChangeShop() {
    this.shopControl = new FormControl(this.filter.shop)
    this.shopControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.shop = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
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

  onChangeBloodCostSlider() {
    this.bloodCostSliderControl = new FormControl(this.filter.bloodCostSlider)
    this.bloodCostSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.bloodCostSlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangePoolCostSlider() {
    this.poolCostSliderControl = new FormControl(this.filter.poolCostSlider)
    this.poolCostSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.poolCostSlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeConvictionCostSlider() {
    this.convictionCostSliderControl = new FormControl(
      this.filter.convictionCostSlider,
    )
    this.convictionCostSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.convictionCostSlider = value
          this.filterChange.emit(this.filter)
        }),
      )
      .subscribe()
  }

  onChangeTrifle(trifle?: string) {
    this.filter.trifle = trifle as 'trifle' | 'non_trifle' | undefined
    this.filterChange.emit(this.filter)
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
