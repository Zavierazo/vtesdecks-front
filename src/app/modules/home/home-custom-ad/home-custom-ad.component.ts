import { AsyncPipe, NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { AdSenseComponent } from '@shared/components/ad-sense/ad-sense.component'
import { AuthQuery } from '@state/auth/auth.query'
import { FeatureFlagQuery } from '@state/feature-flag/feature-flag.query'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { Observable, combineLatest, map } from 'rxjs'

interface HomeCustomAd {
  show: boolean
  url?: string
  image?: string
  imageMobile?: string
}

const HIDDEN: HomeCustomAd = { show: false }

@Component({
  selector: 'app-home-custom-ad',
  templateUrl: './home-custom-ad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    AdSenseComponent,
    TranslocoPipe,
    NgxGoogleAnalyticsModule,
  ],
})
export class HomeCustomAdComponent {
  private readonly featureFlagQuery = inject(FeatureFlagQuery)
  private readonly authQuery = inject(AuthQuery)

  @Input() adClient!: string
  @Input() adSlot!: string
  @Input() adFormat!: string
  @Input() fullWidthResponsive!: string

  ad$: Observable<HomeCustomAd> = combineLatest([
    this.authQuery.selectSupporter(),
    this.authQuery.selectCountryCode(),
    this.featureFlagQuery.selectEnabled('home_ad'),
    this.featureFlagQuery.selectString('home_ad_url'),
    this.featureFlagQuery.selectString('home_ad_image'),
    this.featureFlagQuery.selectString('home_ad_image_mobile'),
    this.featureFlagQuery.selectList('home_ad_countries'),
  ]).pipe(
    map(([supporter, countryCode, enabled, url, image, imageMobile, countries]) => {
      if (supporter || !enabled || !url || !image) {
        return HIDDEN
      }
      if (
        countries.length > 0 &&
        (!countryCode ||
          !countries.some(
            (country: string) => country.toUpperCase() === countryCode,
          ))
      ) {
        return HIDDEN
      }
      return { show: true, url, image, imageMobile: imageMobile || image }
    }),
  )
}
