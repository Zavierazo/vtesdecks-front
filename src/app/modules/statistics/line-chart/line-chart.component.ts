import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ChartConfiguration, ChartData } from 'chart.js'
import { tap } from 'rxjs'
import { ApiHistoricStatistic } from '../../../models/api-historic-statistic'
import { MediaService } from '../../../services/media.service'

@UntilDestroy()
@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements OnInit, OnChanges {
  @Input() title!: string
  @Input() labels: number[] = []
  @Input() range: number[] = [0, 0]
  @Input() statistics!: ApiHistoricStatistic[]

  isTableCollapsed = true

  constructor(private readonly mediaService: MediaService) {}

  data: ChartData<'line', number[], string | string[]> = {
    labels: [],
    datasets: [],
  }

  options: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
    },
  }

  ngOnInit() {
    this.data = this.getChartData(this.statistics)
    this.mediaService
      .observeMobile()
      .pipe(
        untilDestroyed(this),
        tap((isMobile) => {
          this.options!.plugins!.legend!.display = !isMobile
        }),
      )
      .subscribe()
  }

  ngOnChanges(): void {
    this.data = this.getChartData(this.statistics)
  }

  getChartData(
    statistics: ApiHistoricStatistic[],
  ): ChartData<'line', number[], string | string[]> {
    const labels = this.labels
      .filter((label) => label >= this.range[0])
      .filter((label) => label <= this.range[1])
      .map((label) => label.toString())
      .reverse()
    return {
      labels,
      datasets: statistics.map((statistic) => {
        const data = labels.map(
          (label) =>
            statistic.data.find((data) => data.label === label)?.percentage ??
            0,
        )
        return {
          label: statistic.label,
          data: data,
        }
      }),
    }
  }
}