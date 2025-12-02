import { CurrencyPipe } from '@angular/common'
import { Component, input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiCardInfo, ApiCrypt, ApiLibrary } from '@models'
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.component.html',
  styleUrls: ['./card-info.component.scss'],
  imports: [
    TranslocoDirective,
    NgbTooltip,
    NgbCollapse,
    SetTooltipComponent,
    RulingTextComponent,
    NgxGoogleAnalyticsModule,
    RouterLink,
    CurrencyPipe,
    CollectionCardStatsComponent,
    LazyLoadImageModule,
  ],
})
export class CardInfoComponent {
  card = input.required<ApiCrypt | ApiLibrary>()
  cardInfo = input<ApiCardInfo | null>()
  routerClick = output<boolean>()

  rulingsCollapsed = true
  shopsCollapsed = true
}
