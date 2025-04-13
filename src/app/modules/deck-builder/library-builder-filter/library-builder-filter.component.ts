import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { FormControl, FormGroup } from '@angular/forms'
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core'
import { Observable, tap } from 'rxjs'
import { LibraryQuery } from '../../../state/library/library.query'

@UntilDestroy()
@Component({
    selector: 'app-library-builder-filter',
    templateUrl: './library-builder-filter.component.html',
    styleUrls: ['./library-builder-filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class LibraryBuilderFilterComponent implements OnInit, OnChanges {
  @Input() printOnDemand?: boolean
  @Output() printOnDemandChange: EventEmitter<boolean> = new EventEmitter()
  @Input() types!: string[]
  @Output() typesChange: EventEmitter<string[]> = new EventEmitter()
  @Input() clans!: string[]
  @Output() clansChange: EventEmitter<string[]> = new EventEmitter()
  @Input() disciplines!: string[]
  @Output() disciplinesChange: EventEmitter<string[]> = new EventEmitter()
  @Input() sect!: string
  @Output() sectChange: EventEmitter<string> = new EventEmitter()
  @Input() title!: string
  @Output() titleChange: EventEmitter<string> = new EventEmitter()
  @Input() bloodCostSlider!: number[]
  @Output() bloodCostSliderChange: EventEmitter<number[]> = new EventEmitter()
  @Input() poolCostSlider!: number[]
  @Output() poolCostSliderChange: EventEmitter<number[]> = new EventEmitter()
  @Input() taints!: string[]
  @Output() taintsChange: EventEmitter<string[]> = new EventEmitter()

  printOnDemandControl!: FormControl
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

  constructor(private libraryQuery: LibraryQuery) {}

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
