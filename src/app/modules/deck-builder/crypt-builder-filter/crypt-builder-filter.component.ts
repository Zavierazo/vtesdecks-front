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
import { CryptQuery } from '../../../state/crypt/crypt.query'

@UntilDestroy()
@Component({
    selector: 'app-crypt-builder-filter',
    templateUrl: './crypt-builder-filter.component.html',
    styleUrls: ['./crypt-builder-filter.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class CryptBuilderFilterComponent implements OnInit, OnChanges {
  @Input() printOnDemand?: boolean
  @Output() printOnDemandChange: EventEmitter<boolean> = new EventEmitter()
  @Input() clans!: string[]
  @Output() clansChange: EventEmitter<string[]> = new EventEmitter()
  @Input() disciplines!: string[]
  @Output() disciplinesChange: EventEmitter<string[]> = new EventEmitter()
  @Input() superiorDisciplines!: string[]
  @Output() superiorDisciplinesChange: EventEmitter<string[]> =
    new EventEmitter()
  @Input() groupSlider!: number[]
  @Output() groupSliderChange: EventEmitter<number[]> = new EventEmitter()
  @Input() capacitySlider!: number[]
  @Output() capacitySliderChange: EventEmitter<number[]> = new EventEmitter()
  @Input() title!: string
  @Output() titleChange: EventEmitter<string> = new EventEmitter()
  @Input() sect!: string
  @Output() sectChange: EventEmitter<string> = new EventEmitter()
  @Input() taints!: string[]
  @Output() taintsChange: EventEmitter<string[]> = new EventEmitter()

  printOnDemandControl!: FormControl
  groupSliderControl!: FormControl
  capacitySliderControl!: FormControl
  titleControl!: FormControl
  sectControl!: FormControl
  taintGroup!: FormGroup

  titles$!: Observable<string[]>
  sects$!: Observable<string[]>
  taints$!: Observable<string[]>
  maxCapacity!: number
  maxGroup!: number

  constructor(private cryptQuery: CryptQuery) {}

  ngOnInit() {
    this.maxCapacity = this.cryptQuery.getMaxCapacity()
    this.maxGroup = this.cryptQuery.getMaxGroup()
    this.titles$ = this.cryptQuery.selectTitles()
    this.sects$ = this.cryptQuery.selectSects()
    this.taints$ = this.cryptQuery.selectTaints()
    this.initFormControls()
  }

  ngOnChanges() {
    this.initFormControls()
  }

  initFormControls() {
    this.onChangePrintOnDemand()
    this.onChangeGroupSlider()
    this.onChangeCapacitySlider()
    this.onChangeTitle()
    this.onChangeSect()
    this.onChangeTaint()
  }

  onChangeClanFilter(clans: string[]) {
    this.clans = clans
    this.clansChange.emit(clans)
  }

  onChangeDisciplineFilter(disciplines: string[]) {
    this.disciplines = disciplines
    this.disciplinesChange.emit(disciplines)
  }

  onChangeSuperiorDisciplineFilter(superiorDisciplines: string[]) {
    this.superiorDisciplines = superiorDisciplines
    this.superiorDisciplinesChange.emit(superiorDisciplines)
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

  onChangeGroupSlider() {
    this.groupSliderControl = new FormControl(this.groupSlider)
    this.groupSliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.groupSlider = value
          this.groupSliderChange.emit(value)
        }),
      )
      .subscribe()
  }

  onChangeCapacitySlider() {
    this.capacitySliderControl = new FormControl(this.capacitySlider)
    this.capacitySliderControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((value) => {
          this.capacitySlider = value
          this.capacitySliderChange.emit(value)
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

  onChangeTaint() {
    this.taintGroup = new FormGroup({})
    this.cryptQuery.getTaints().forEach((taint) => {
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
