import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { ApiStatistic } from '@models'
import { ChartConfiguration, ChartData } from 'chart.js'
import { BaseChartDirective } from 'ng2-charts'

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BaseChartDirective],
})
export class BarChartComponent implements OnInit {
  @Input() title!: string
  @Input() labels: string[] = []
  @Input() statistics!: ApiStatistic[]

  data: ChartData<'bar', number[], string | string[]> = {
    labels: [],
    datasets: [],
  }

  options: ChartConfiguration['options'] = {
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  ngOnInit() {
    this.data = this.getChartData(this.statistics)
  }
  getChartData(
    statistics: ApiStatistic[],
  ): ChartData<'bar', number[], string | string[]> {
    return {
      labels: this.labels,
      datasets: [
        {
          data: this.labels.map(
            (l) => statistics.find((s) => s.label === l)?.count ?? 0,
          ),
          label: 'Count',
        },
      ],
    }
  }
}
