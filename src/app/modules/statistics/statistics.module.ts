import { NgxSliderModule } from '@angular-slider/ngx-slider'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { TranslocoModule } from '@ngneat/transloco'
import {
  BaseChartDirective,
  provideCharts,
  withDefaultRegisterables,
} from 'ng2-charts'
import { SharedModule } from '../../shared/shared.module'
import { BarChartComponent } from './bar-chart/bar-chart.component'
import { LineChartComponent } from './line-chart/line-chart.component'
import { RadarChartComponent } from './radar-chart/radar-chart.component'
import { StatisticsComponent } from './statistics.component'

const routes: Routes = [
  {
    path: '',
    component: StatisticsComponent,
    pathMatch: 'full',
    title: 'VTES Decks - Stadistics',
  },
]

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    NgbModule,
    NgxSliderModule,
    TranslocoModule,
    BaseChartDirective,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
  declarations: [
    StatisticsComponent,
    RadarChartComponent,
    BarChartComponent,
    LineChartComponent,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
})
export class StatisticsModule {}
