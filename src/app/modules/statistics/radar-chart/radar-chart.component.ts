import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { ChartData, ChartOptions } from 'chart.js'
import { ApiStatistic } from '../../../models/api-statistic'
import { BaseChartDirective } from 'ng2-charts';

@Component({
    selector: 'app-radar-chart',
    templateUrl: './radar-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BaseChartDirective]
})
export class RadarChartComponent implements OnInit {
  @Input() title!: string
  @Input() statistics!: ApiStatistic[]

  data: ChartData<'radar'> = {
    labels: [],
    datasets: [],
  }

  options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  ngOnInit() {
    this.data = this.getChartData(this.statistics)
  }

  getChartData(statistics: ApiStatistic[]): ChartData<'radar'> {
    return {
      labels: statistics.map((s) => s.label),
      datasets: [
        {
          data: statistics.map((s) => s.count),
          label: 'Count',
        },
      ],
    }
  }
}
