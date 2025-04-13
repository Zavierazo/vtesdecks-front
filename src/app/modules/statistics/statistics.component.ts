import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { FormBuilder, FormControl, FormGroup } from '@angular/forms'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { ApiHistoricStatistic } from '../../models/api-historic-statistic'
import { ApiYearStatistic } from '../../models/api-year-statistic'
import { CLAN_LIST } from '../../utils/clans'
import { DISCIPLINE_LIST } from '../../utils/disciplines'
import { ApiDataService } from './../../services/api.data.service'

@UntilDestroy()
@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsComponent implements OnInit {
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

  constructor(
    private readonly apiDataService: ApiDataService,
    private readonly formBuilder: FormBuilder,
  ) {}

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
