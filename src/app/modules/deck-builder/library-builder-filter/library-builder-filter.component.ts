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
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable, tap } from 'rxjs'
import { ApiSet } from '../../../models/api-set'
import { TranslocoFallbackPipe } from '../../../shared/pipes/transloco-fallback'
import { LibraryQuery } from '../../../state/library/library.query'
import { SetQuery } from '../../../state/set/set.query'
import { PATH_LIST } from '../../../utils/paths'
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
  private setQuery = inject(SetQuery)

  @Input() limitedFormat?: boolean
  readonly limitedFormatChange = output<boolean>()
  @Input() printOnDemand?: boolean
  readonly printOnDemandChange = output<boolean>()
  @Input() types!: string[]
  readonly typesChange = output<string[]>()
  @Input() clans!: string[]
  readonly clansChange = output<string[]>()
  @Input() disciplines!: string[]
  readonly disciplinesChange = output<string[]>()
  @Input() sect!: string
  readonly sectChange = output<string>()
  @Input() path!: string
  readonly pathChange = output<string>()
  @Input() title!: string
  readonly titleChange = output<string>()
  @Input() set!: string
  readonly setChange = output<string>()
  @Input() bloodCostSlider!: number[]
  readonly bloodCostSliderChange = output<number[]>()
  @Input() poolCostSlider!: number[]
  readonly poolCostSliderChange = output<number[]>()
  @Input() taints!: string[]
  readonly taintsChange = output<string[]>()
  @Input() cardText!: string
  readonly cardTextChange = output<string>()

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  sectControl!: FormControl
  pathControl!: FormControl
  titleControl!: FormControl
  setControl!: FormControl
  bloodCostSliderControl!: FormControl
  poolCostSliderControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl

  sects$!: Observable<string[]>
  titles$!: Observable<string[]>
  taints$!: Observable<string[]>
  sets$!: Observable<ApiSet[]>
  pathList = PATH_LIST
  maxCapacity!: number
  maxGroup!: number

  ngOnInit() {
    this.sects$ = this.libraryQuery.selectSects()
    this.titles$ = this.libraryQuery.selectTitles()
    this.taints$ = this.libraryQuery.selectTaints()
    this.sets$ = this.setQuery.selectAll({
      sortBy: 'releaseDate',
      sortByOrder: 'desc',
    })
    this.initFormControls()
  }

  ngOnChanges() {
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
  }

  onChangeTypeFilter(types: string[]) {
    this.types = types
    this.typesChange.emit(types)
  }

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.clansChange.emit(clans)
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.disciplinesChange.emit(disciplines)
  }

  onChangePrintOnDemand() {
    this.printOnDemandControl = new FormControl(this.printOnDemand)
    this.printOnDemandControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.printOnDemand = value
          this.printOnDemandChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeLimitedFormat() {
    this.limitedFormatControl = new FormControl(this.limitedFormat)
    this.limitedFormatControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.limitedFormat = value
          this.limitedFormatChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeSect() {
    this.sectControl = new FormControl(this.sect)
    this.sectControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.sect = value
          this.sectChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangePath() {
    this.pathControl = new FormControl(this.path)
    this.pathControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.path = value
          this.pathChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeTitle() {
    this.titleControl = new FormControl(this.title)
    this.titleControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.title = value
          this.titleChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeSet() {
    this.setControl = new FormControl(this.set)
    this.setControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.set = value
          this.setChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeBloodCostSlider() {
    this.bloodCostSliderControl = new FormControl(this.bloodCostSlider)
    this.bloodCostSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.bloodCostSlider = value
          this.bloodCostSliderChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangePoolCostSlider() {
    this.poolCostSliderControl = new FormControl(this.poolCostSlider)
    this.poolCostSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.poolCostSlider = value
          this.poolCostSliderChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeTaint() {
    this.taintGroup = new FormGroup({})
    this.libraryQuery.getTaints().forEach((taint) => {
      this.taintGroup.addControl(
        taint,
        new FormControl(this.taints.includes(taint)),
      )
      this.taintGroup
        .get(taint)
        ?.valueChanges.pipe(
          untilDestroyed(this),
          tap((value) => {
            const newTaints = this.taints.filter((t) => t !== taint)
            if (value) {
              newTaints.push(taint)
            }
            this.taints = newTaints
            this.taintsChange.emit(this.taints)
          }),
        )
        .subscribe()
    })
  }

  onChangeCardText() {
    this.cardTextControl = new FormControl(this.cardText)
    this.cardTextControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.cardText = value
          this.cardTextChange.emit(value)
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
