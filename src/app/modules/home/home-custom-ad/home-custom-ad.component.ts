import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core'
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

  readonly featuresLoaded$ = this.featureFlagQuery
    .selectSnapshot()
    .pipe(map(({ loaded }) => loaded))

  ad$: Observable<HomeCustomAd | null> = combineLatest([
    this.authQuery.selectSupporter(),
    this.authQuery.selectCountryCode(),
    this.authQuery.selectCountryLoaded(),
    this.featureFlagQuery.selectSnapshot(),
  ]).pipe(
    map(([supporter, countryCode, countryLoaded, { loaded, flags }]) => {
      // Do not create the AdSense fallback until the sponsor decision is known.
      if (supporter || !loaded) {
        return null
      }
      const stringFlag = (key: string): string | undefined => {
        const flag = flags[key]
        return flag?.type === 'STRING' && typeof flag.value === 'string'
          ? flag.value
          : undefined
      }
      const enabled =
        flags['home_ad']?.type === 'BOOLEAN' && flags['home_ad'].value === true
      const url = stringFlag('home_ad_url')
      const image = stringFlag('home_ad_image')
      const imageMobile = stringFlag('home_ad_image_mobile')
      const countryFlag = flags['home_ad_countries']
      const countries =
        countryFlag?.type === 'LIST' && Array.isArray(countryFlag.value)
          ? countryFlag.value
          : []
      if (!enabled || !url || !image) {
        return HIDDEN
      }
      if (countries.length > 0 && !countryLoaded) {
        return null
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
