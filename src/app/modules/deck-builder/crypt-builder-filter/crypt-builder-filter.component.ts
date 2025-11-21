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
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiSet } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { PATH_LIST } from '@utils'
import { Observable, tap } from 'rxjs'
import { TranslocoFallbackPipe } from '../../../shared/pipes/transloco-fallback'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { SetQuery } from '../../../state/set/set.query'
import { ClanFilterComponent } from '../../deck-shared/clan-filter/clan-filter.component'
import { DisciplineFilterComponent } from '../../deck-shared/discipline-filter/discipline-filter.component'

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
    NgxSliderModule,
    AsyncPipe,
    TitleCasePipe,
    TranslocoFallbackPipe,
    TranslocoPipe,
    DatePipe,
  ],
})
export class CryptBuilderFilterComponent implements OnInit, OnChanges {
  private cryptQuery = inject(CryptQuery)
  private setQuery = inject(SetQuery)

  @Input() limitedFormat?: boolean
  readonly limitedFormatChange = output<boolean>()
  @Input() printOnDemand?: boolean
  readonly printOnDemandChange = output<boolean>()
  @Input() clans!: string[]
  readonly clansChange = output<string[]>()
  @Input() disciplines!: string[]
  readonly disciplinesChange = output<string[]>()
  @Input() superiorDisciplines!: string[]
  readonly superiorDisciplinesChange = output<string[]>()
  @Input() groupSlider!: number[]
  readonly groupSliderChange = output<number[]>()
  @Input() capacitySlider!: number[]
  readonly capacitySliderChange = output<number[]>()
  @Input() title!: string
  readonly titleChange = output<string>()
  @Input() sect!: string
  readonly sectChange = output<string>()
  @Input() path!: string
  readonly pathChange = output<string>()
  @Input() set!: string
  readonly setChange = output<string>()
  @Input() taints!: string[]
  readonly taintsChange = output<string[]>()
  @Input() cardText!: string
  readonly cardTextChange = output<string>()

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  groupSliderControl!: FormControl
  capacitySliderControl!: FormControl
  titleControl!: FormControl
  sectControl!: FormControl
  pathControl!: FormControl
  setControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl

  titles$!: Observable<string[]>
  sects$!: Observable<string[]>
  taints$!: Observable<string[]>
  sets$!: Observable<ApiSet[]>
  pathList = PATH_LIST
  maxCapacity!: number
  maxGroup!: number

  ngOnInit() {
    this.maxCapacity = this.cryptQuery.getMaxCapacity()
    this.maxGroup = this.cryptQuery.getMaxGroup()
    this.titles$ = this.cryptQuery.selectTitles()
    this.sects$ = this.cryptQuery.selectSects()
    this.taints$ = this.cryptQuery.selectTaints()
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
    this.onChangeGroupSlider()
    this.onChangeCapacitySlider()
    this.onChangeTitle()
    this.onChangeSet()
    this.onChangeSect()
    this.onChangePath()
    this.onChangeTaint()
    this.onChangeCardText()
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
