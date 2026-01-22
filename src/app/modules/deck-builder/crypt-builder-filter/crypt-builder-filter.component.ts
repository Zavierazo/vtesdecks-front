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
import { CryptFilter } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { TranslocoFallbackPipe } from '@shared/pipes/transloco-fallback'
import { CryptQuery } from '@state/crypt/crypt.query'
import { PATH_LIST } from '@utils'
import { tap } from 'rxjs'
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
  private apiDataService = inject(ApiDataService)

  @Input() filter!: CryptFilter
  readonly filterChange = output<CryptFilter>()

  printOnDemandControl!: FormControl
  limitedFormatControl!: FormControl
  predefinedLimitedFormatControl!: FormControl
  groupSliderControl!: FormControl
  capacitySliderControl!: FormControl
  titleControl!: FormControl
  sectControl!: FormControl
  pathControl!: FormControl
  setControl!: FormControl
  taintGroup!: FormGroup
  cardTextControl!: FormControl
  artistControl!: FormControl

  titles$ = this.cryptQuery.selectTitles()
  sects$ = this.cryptQuery.selectSects()
  taints$ = this.cryptQuery.selectTaints()
  sets$ = this.cryptQuery.selectSets()
  pathList = PATH_LIST
  predefinedLimitedFormats$ = this.apiDataService.getLimitedFormats()
  maxCapacity = this.cryptQuery.getMaxCapacity()
  maxGroup = this.cryptQuery.getMaxGroup()
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
    this.onChangeGroupSlider()
    this.onChangeCapacitySlider()
    this.onChangeTitle()
    this.onChangeSet()
    this.onChangeSect()
    this.onChangePath()
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
