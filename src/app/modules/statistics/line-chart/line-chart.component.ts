import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core'
import { ChartConfiguration, ChartData } from 'chart.js'
import { ApiHistoricStatistic } from '../../../models/api-historic-statistic'

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements OnInit, OnChanges {
  @Input() title!: string
  @Input() labels: number[] = []
  @Input() range: number[] = [0, 0]
  @Input() statistics!: ApiHistoricStatistic[]

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
  }

  ngOnChanges(changes: SimpleChanges): void {
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
            statistic.data.find((data) => data.label === label)?.count ?? 0,
        )
        return {
          label: statistic.label,
          data: data,
        }
      }),
    }
  }
}
