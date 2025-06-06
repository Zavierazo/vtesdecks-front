import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, inject, output } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable, tap } from 'rxjs'
import { TranslocoFallbackPipe } from '../../../shared/pipes/transloco-fallback'
import { LibraryQuery } from '../../../state/library/library.query'
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
    TranslocoPipe
],
})
export class LibraryBuilderFilterComponent implements OnInit, OnChanges {
  private libraryQuery = inject(LibraryQuery);

  @Input() limitedFormat?: boolean
  readonly limitedFormatChange = output<boolean>();
  @Input() printOnDemand?: boolean
  readonly printOnDemandChange = output<boolean>();
  @Input() types!: string[]
  readonly typesChange = output<string[]>();
  @Input() clans!: string[]
  readonly clansChange = output<string[]>();
  @Input() disciplines!: string[]
  readonly disciplinesChange = output<string[]>();
  @Input() sect!: string
  readonly sectChange = output<string>();
  @Input() title!: string
  readonly titleChange = output<string>();
  @Input() bloodCostSlider!: number[]
  readonly bloodCostSliderChange = output<number[]>();
  @Input() poolCostSlider!: number[]
  readonly poolCostSliderChange = output<number[]>();
  @Input() taints!: string[]
  readonly taintsChange = output<string[]>();

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  sectControl!: FormControl
  titleControl!: FormControl
  bloodCostSliderControl!: FormControl
  poolCostSliderControl!: FormControl
  taintGroup!: FormGroup

  sects$!: Observable<string[]>
  titles$!: Observable<string[]>
  taints$!: Observable<string[]>
  maxCapacity!: number
  maxGroup!: number

  ngOnInit() {
    this.sects$ = this.libraryQuery.selectSects()
    this.titles$ = this.libraryQuery.selectTitles()
    this.taints$ = this.libraryQuery.selectTaints()
    this.initFormControls()
  }

  ngOnChanges() {
    this.initFormControls()
  }

  initFormControls() {
    this.onChangePrintOnDemand()
    this.onChangeLimitedFormat()
    this.onChangeSect()
    this.onChangeTitle()
    this.onChangeBloodCostSlider()
    this.onChangePoolCostSlider()
    this.onChangeTaint()
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

  translateGroupSlider(value: number): string {
    if (value === 0) {
      return 'any'
    }
    return `${value}`
  }
}
