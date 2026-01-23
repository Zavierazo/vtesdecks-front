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
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { LibraryFilter } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { LibraryQuery } from '@state/library/library.query'
import { PATH_LIST } from '@utils'
import { tap } from 'rxjs'
import { ClanFilterComponent } from '../../deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '../../deck-shared/discipline-filter/discipline-filter.component'
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
    NgxSliderModule,
    AsyncPipe,
    TitleCasePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    DatePipe,
  ],
})
export class LibraryBuilderFilterComponent implements OnInit, OnChanges {
  private libraryQuery = inject(LibraryQuery)
  private apiDataService = inject(ApiDataService)

  @Input() filter!: LibraryFilter
  readonly filterChange = output<LibraryFilter>()

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  predefinedLimitedFormatControl!: FormControl
  sectControl!: FormControl
  pathControl!: FormControl
  titleControl!: FormControl
  setControl!: FormControl
  bloodCostSliderControl!: FormControl
  poolCostSliderControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl
  artistControl!: FormControl

  sects$ = this.libraryQuery.selectSects()
  titles$ = this.libraryQuery.selectTitles()
  taints$ = this.libraryQuery.selectTaints()
  sets$ = this.libraryQuery.selectSets()
  pathList = PATH_LIST
  predefinedLimitedFormats$ = this.apiDataService.getLimitedFormats()
  initialized = false

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
    this.onChangeSect()
    this.onChangePath()
    this.onChangeTitle()
    this.onChangeSet()
    this.onChangeBloodCostSlider()
    this.onChangePoolCostSlider()
    this.onChangeTaint()
    this.onChangeCardText()
    this.onChangePredefinedLimitedFormat()
    this.onChangeArtist()
  }

  onChangeTypeFilter(types: string[]) {
    this.filter.types = types
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

  onChangePath() {
    this.pathControl = new FormControl(this.filter.path)
    this.pathControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.filter.path = value
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
