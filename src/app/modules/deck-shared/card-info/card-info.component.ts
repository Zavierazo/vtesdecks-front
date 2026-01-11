import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common'
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCardInfo, ApiCrypt, ApiLibrary, ApiShop } from '@models'
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { LocalePipe } from '@shared/pipes/locale.pipe'
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { finalize, tap } from 'rxjs'
import { CollectionCardStatsComponent } from '../collection-card-stats/collection-card-stats.component'
import { RulingTextComponent } from '../ruling-text/ruling-text/ruling-text.component'
import { SetTooltipComponent } from '../set-tooltip/set-tooltip.component'

@UntilDestroy()
@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.component.html',
  styleUrls: ['./card-info.component.scss'],
  imports: [
    TranslocoDirective,
    TranslocoPipe,
    NgbTooltip,
    NgbCollapse,
    SetTooltipComponent,
    RulingTextComponent,
    NgxGoogleAnalyticsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    CollectionCardStatsComponent,
    LazyLoadImageModule,
    LocalePipe,
    TitleCasePipe,
  ],
})
export class CardInfoComponent {
  private apiDataService = inject(ApiDataService)
  private router = inject(Router)

  card = input.required<ApiCrypt | ApiLibrary>()
  artists = computed(() =>
    this.card().artist
      ? [
          ...new Set(
            this.card()
              .artist.split(';')
              .map((artist) => artist.trim())
              .filter((artist) => artist.length > 0),
          ),
        ]
      : undefined,
  )
  cardInfo = input<ApiCardInfo | null>()
  routerClick = output<boolean>()

  rulingsCollapsed = true
  changesCollapsed = true
  shopsCollapsed = true
  loading = signal(false)
  cardShops = signal<ApiShop[] | null>(null)

  displayCardInfo = computed(() => {
    const cardInfo = this.cardInfo()
    const cardShops = this.cardShops()

    if (!cardInfo) {
      return null
    }

    if (!cardShops) {
      return this.cardInfo()
    }

    if (
      cardInfo.shopList &&
      cardInfo.shopList[0]?.cardId !== cardShops[0]?.cardId
    ) {
      return this.cardInfo()
    }

    return {
      ...cardInfo,
      shopList: cardShops,
      hasMoreShops: false,
    }
  })

  onLoadMoreShops(): void {
    const currentCardInfo = this.cardInfo()
    if (!currentCardInfo || this.loading()) {
      return
    }
    this.loading.set(true)
    this.apiDataService
      .getCardShops(this.card().id, true)
      .pipe(
        untilDestroyed(this),
        tap((shopList) => this.cardShops.set(shopList)),
        finalize(() => this.loading.set(false)),
      )
      .subscribe()
  }
}
