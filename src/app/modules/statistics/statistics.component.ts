import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiHistoricStatistic, ApiYearStatistic } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { CLAN_LIST, DISCIPLINE_LIST } from '@utils'
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { BarChartComponent } from './bar-chart/bar-chart.component'
import { LineChartComponent } from './line-chart/line-chart.component'
import { RadarChartComponent } from './radar-chart/radar-chart.component'

@UntilDestroy()
@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    NgxSliderModule,
    LineChartComponent,
    BarChartComponent,
    RadarChartComponent,
    AsyncPipe,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
})
export class StatisticsComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly formBuilder = inject(FormBuilder)

  currentYear = new Date().getFullYear()
  years = this.range(1998, this.currentYear)
  disciplines: string[] = DISCIPLINE_LIST.map((d) => d.name)
  clans: string[] = CLAN_LIST.map((c) => c.name)
  tagStatistics$!: Observable<ApiHistoricStatistic[]>
  disciplineStatistics$!: Observable<ApiHistoricStatistic[]>
  clanStatistics$!: Observable<ApiHistoricStatistic[]>
  statistics$!: Observable<ApiYearStatistic>
  rangeBehavior: BehaviorSubject<number[]> = new BehaviorSubject([0, 0])
  globalForm!: FormGroup
  yearForm!: FormGroup

  ngOnInit() {
    this.globalForm = this.formBuilder.group({
      year: new FormControl([1998, this.currentYear]),
      type: new FormControl('ALL'),
    })
    this.rangeBehavior.next(this.globalForm.get('year')?.value)

    this.yearForm = this.formBuilder.group({
      year: new FormControl(this.currentYear),
    })
    this.getHistoricStatistics()
    this.getStatistics()

    this.globalForm
      .get('type')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        tap(() => this.getHistoricStatistics()),
        tap(() => this.getStatistics()),
      )
      .subscribe()
    this.globalForm
      .get('year')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        tap(() => {
          this.rangeBehavior.next(this.globalForm.get('year')?.value)
        }),
      )
      .subscribe()

    this.yearForm
      .get('year')
      ?.valueChanges.pipe(
        untilDestroyed(this),
        tap(() => this.getStatistics()),
      )
      .subscribe()
  }

  private getStatistics(): void {
    this.statistics$ = this.apiDataService.getStatistics(
      this.yearForm.get('year')?.value,
      this.globalForm.get('type')?.value,
    )
  }

  private getHistoricStatistics(): void {
    this.tagStatistics$ = this.apiDataService.getHistoricTagStatistics(
      this.globalForm.get('type')?.value,
    )
    this.disciplineStatistics$ =
      this.apiDataService.getHistoricDisciplineStatistics(
        this.globalForm.get('type')?.value,
      )
    this.clanStatistics$ = this.apiDataService.getHistoricClanStatistics(
      this.globalForm.get('type')?.value,
    )
  }

  private range(start: number, end: number): number[] {
    return Array.from(
      { length: end - start + 1 },
      (_, i) => start + i,
    ).reverse()
  }
}
